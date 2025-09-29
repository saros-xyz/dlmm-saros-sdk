import { BN, utils } from '@coral-xyz/anchor';
import { BinArrayAccount, PairMetadata } from '../types';
import * as spl from '@solana/spl-token';
import { ComputeBudgetProgram, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bigDecimal from 'js-big-decimal';
import cloneDeep from 'lodash/cloneDeep';
import {
  BIN_ARRAY_INDEX,
  BIN_ARRAY_SIZE,
  CCU_LIMIT,
  FIXED_LENGTH,
  MAX_BASIS_POINTS,
  MAX_BIN_CROSSINGS,
  PRECISION,
  SCALE_OFFSET,
  UNIT_PRICE_DEFAULT,
  WRAP_SOL_ADDRESS,
} from '../constants';
import {
  AddLiquidityIntoPositionParams,
  BinReserveInfo,
  CreatePositionParams,
  GetBinArrayParams,
  GetBinsArrayInfoParams,
  GetBinsReserveParams,
  GetTokenOutputParams,
  GetTokenOutputResponse,
  Pair,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
  SwapParams,
} from '../types/services';
import { mulDivBN, mulShr, shlDiv } from '../utils/math';
import { calcAmountInByPrice, calcAmountOutByPrice, getPriceFromId } from '../utils/price';
import { Volatility } from '../utils/volatility';
import { getFeeAmount, getFeeForAmount, getFeeMetadata, getProtocolFee, getTotalFee } from '../utils/fees';
import { BinArrayRange } from '../utils/bin-range';
import { DLMMBase, SarosConfig } from './base';
import { getProgram } from '../utils/token';
import { DLMMError } from '../error';
import { getGasPrice } from '../utils/transaction';
import { deriveBinArrayPDA } from '../utils/pda';

export class DLMMPair extends DLMMBase {
  private pairAddress: PublicKey;
  private pairAccount!: Pair;
  private metadata!: PairMetadata;
  private volatility: Volatility;
  private tokenProgramX?: PublicKey;
  private tokenProgramY?: PublicKey;
  private tokenVaultX?: PublicKey;
  private tokenVaultY?: PublicKey;
  bufferGas?: number;

  constructor(config: SarosConfig, pairAddress: PublicKey) {
    super(config);
    this.pairAddress = pairAddress;
    this.volatility = new Volatility();
  }

  /**
   * Fetch and cache pair account data and metadata
   */
  public async refreshState(): Promise<void> {
    try {
      //@ts-ignore
      this.pairAccount = await this.lbProgram.account.pair.fetch(this.pairAddress);
      this.metadata = await this.buildPairMetadata();
    } catch (_error) {
      throw new DLMMError('Failed to fetch pair account data', 'PAIR_FETCH_FAILED');
    }
  }

  /**
   * Get cached pair account
   */
  public getPairAccount(): Pair {
    return this.pairAccount;
  }

  /**
   * Get cached pair metadata
   */
  public getPairMetadata(): PairMetadata {
    return this.metadata;
  }

  /**
   * Get pair address
   */
  public getPairAddress(): PublicKey {
    return this.pairAddress;
  }

  /**
   * Build metadata from cached pair account
   */
  private async buildPairMetadata(): Promise<PairMetadata> {
    const { tokenMintX, tokenMintY, hook } = this.pairAccount;
    const tokenProgramX = await getProgram(tokenMintX, this.connection);
    const tokenProgramY = await getProgram(tokenMintY, this.connection);

    const tokenVaultX = spl.getAssociatedTokenAddressSync(tokenMintX, this.pairAddress, true, tokenProgramX);
    const tokenVaultY = spl.getAssociatedTokenAddressSync(tokenMintY, this.pairAddress, true, tokenProgramY);

    // store in cache
    this.tokenProgramX = tokenProgramX;
    this.tokenProgramY = tokenProgramY;
    this.tokenVaultX = tokenVaultX;
    this.tokenVaultY = tokenVaultY;

    const [reserveX, reserveY] = await Promise.all([
      this.connection.getTokenAccountBalance(tokenVaultX).catch(() => ({
        value: {
          uiAmount: 0,
          amount: '0',
          decimals: 0,
          uiAmountString: '0',
        },
      })),
      this.connection.getTokenAccountBalance(tokenVaultY).catch(() => ({
        value: {
          uiAmount: 0,
          amount: '0',
          decimals: 0,
          uiAmountString: '0',
        },
      })),
    ]);

    // Calculate fees as percentages
    const { baseFee, dynamicFee, protocolFee } = getFeeMetadata(this.pairAccount);

    return {
      pair: this.pairAddress.toString(),
      tokenX: {
        mintAddress: tokenMintX.toString(),
        decimals: reserveX.value.decimals,
        reserve: reserveX.value.amount,
      },
      tokenY: {
        mintAddress: tokenMintY.toString(),
        decimals: reserveY.value.decimals,
        reserve: reserveY.value.amount,
      },
      binStep: this.pairAccount.binStep,
      baseFee,
      dynamicFee,
      protocolFee,
      extra: {
        hook: hook?.toString() || undefined,
      },
    };
  }

  // ========== SWAP & QUOTE METHODS ==========

  public async getQuote(params: GetTokenOutputParams): Promise<GetTokenOutputResponse> {
    try {
      // throw error if incorrect param amounts
      if (params.amount <= 0n) throw new DLMMError('Quote amount must be greater than 0', 'ZERO_AMOUNT');
      if (params.slippage < 0 || params.slippage >= 100)
        throw new DLMMError('Invalid slippage percentage', 'INVALID_SLIPPAGE');
    
      const data = await this.calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      const slippageFraction = params.slippage / 100;
      const slippageScaled = Math.round(slippageFraction * PRECISION);
      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;
      if (params.isExactInput) {
        minAmountOut = (amountOut * BigInt(PRECISION - slippageScaled)) / BigInt(PRECISION);
      } else {
        maxAmountIn = (amountIn * BigInt(PRECISION)) / BigInt(PRECISION - slippageScaled);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee(
        Number(amountIn.toString()),
        params.swapForY,
        params.tokenBaseDecimal,
        params.tokenQuoteDecimal
      );

      const priceImpact = new bigDecimal(amountOut.toString())
        .subtract(new bigDecimal(maxAmountOut.toString()))
        .divide(new bigDecimal(maxAmountOut.toString()))
        .multiply(new bigDecimal(100))
        .getValue();

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: params.isExactInput ? maxAmountIn : minAmountOut,
        otherAmountOffset: params.isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: Number(priceImpact),
      };
    } catch (error) {
      throw error;
    }
  }

  // kept public as before
  public async getMaxAmountOutWithFee(
    amount: number,
    swapForY: boolean = false,
    decimalBase: number = 9,
    decimalQuote: number = 9
  ) {
    try {
      let amountIn = BigInt(amount);
      const activeId = this.pairAccount.activeId;
      const binStep = this.pairAccount.binStep;
      const feePrice = getTotalFee(this.pairAccount, 0);
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(binStep, activeId, decimalBase, decimalQuote);

      const feeAmount = getFeeAmount(amountIn, feePrice);
      amountIn = BigInt(amountIn) - BigInt(feeAmount);
      const maxAmountOut = swapForY
        ? mulShr(Number(amountIn.toString()), activePrice, SCALE_OFFSET, 'down')
        : shlDiv(Number(amountIn.toString()), activePrice, SCALE_OFFSET, 'down');

      return { maxAmountOut, price };
    } catch {}

    return { maxAmountOut: 0, price: 0 };
  }

  public async swap(params: SwapParams): Promise<Transaction> {
    const { tokenMintX, tokenMintY, amount, otherAmountOffset, swapForY, isExactInput, hook, payer } = params;

    const currentBinArrayIndex = Math.floor(this.pairAccount.activeId / BIN_ARRAY_SIZE);

    const surroundingIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(
        async (idx) =>
          await this.getBinArray({
            binArrayIndex: idx,
            pair: this.pairAddress,
            payer,
          })
      )
    );

    const binArrayAccountsInfo = await this.connection.getMultipleAccountsInfo(binArrayAddresses);

    const validIndexes = surroundingIndexes.filter((_, i) => binArrayAccountsInfo[i]);

    if (validIndexes.length < 2) {
      throw new Error('No valid bin arrays found for the pair');
    }

    let binArrayLowerIndex: number;
    let binArrayUpperIndex: number;
    if (validIndexes.length === 2) {
      [binArrayLowerIndex, binArrayUpperIndex] = validIndexes;
    } else {
      const activeOffset = this.pairAccount.activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] = activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    const binArrayLower = await this.getBinArray({
      pair: this.pairAddress,
      binArrayIndex: binArrayLowerIndex,
      payer,
    });

    const binArrayUpper = await this.getBinArray({
      pair: this.pairAddress,
      binArrayIndex: binArrayUpperIndex,
      payer,
    });

    const [tokenProgramX, tokenProgramY] = await Promise.all([
      getProgram(tokenMintX, this.connection),
      getProgram(tokenMintY, this.connection),
    ]);

    const latestBlockHash = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    const associatedPairVaultX = spl.getAssociatedTokenAddressSync(tokenMintX, this.pairAddress, true, tokenProgramX);

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(tokenMintY, this.pairAddress, true, tokenProgramY);

    const associatedUserVaultX = spl.getAssociatedTokenAddressSync(tokenMintX, payer, true, tokenProgramX);

    const associatedUserVaultY = spl.getAssociatedTokenAddressSync(tokenMintY, payer, true, tokenProgramY);

    const infoUserVaultX = await this.connection.getAccountInfo(associatedUserVaultX);

    if (!infoUserVaultX) {
      const userVaultXInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultX,
        payer,
        tokenMintX,
        tokenProgramX
      );

      tx.add(userVaultXInstructions);
    }

    const infoUserVaultY = await this.connection.getAccountInfo(associatedUserVaultY);

    if (!infoUserVaultY) {
      const userVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultY,
        payer,
        tokenMintY,
        tokenProgramY
      );

      tx.add(userVaultYInstructions);
    }

    if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if (isNativeY && !swapForY) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: Number(amount),
          })
        );
        tx.add(spl.createSyncNativeInstruction(associatedUserVault));
      }

      if (!isNativeY && swapForY) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: Number(amount),
          })
        );
        tx.add(spl.createSyncNativeInstruction(associatedUserVault));
      }
    }

    const swapInstructions = await this.lbProgram.methods
      .swap(
        new BN(amount.toString()),
        new BN(otherAmountOffset.toString()),
        swapForY,
        isExactInput ? { exactInput: {} } : { exactOutput: {} }
      )
      .accountsPartial({
        pair: this.pairAddress,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        tokenVaultX: associatedPairVaultX,
        tokenVaultY: associatedPairVaultY,
        userVaultX: associatedUserVaultX,
        userVaultY: associatedUserVaultY,
        tokenMintX: tokenMintX,
        tokenMintY: tokenMintY,
        tokenProgramX,
        tokenProgramY,
        user: payer,
        hook: hook || null,
        hooksProgram: this.hooksProgram.programId,
      })
      .remainingAccounts([
        { pubkey: this.pairAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        tx.add(spl.createCloseAccountInstruction(associatedUserVault, payer, payer));
      }
    }

    return tx;
  }

  // ========== LIQUIDITY METHODS ==========
  async createPosition(params: CreatePositionParams) {
    const { payer, binIdLeft, binIdRight, positionMint, transaction } = params;

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);

    const firstBinId = this.pairAccount.activeId + binIdLeft;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    await this.getBinArray({
      binArrayIndex,
      pair: this.pairAddress,
      payer,
    });

    await this.getBinArray({
      binArrayIndex: binArrayIndex + 1,
      pair: this.pairAddress,
      payer,
    });

    const initializePositionTx = await this.lbProgram.methods
      .createPosition(new BN(binIdLeft), new BN(binIdRight))
      .accountsPartial({
        pair: this.pairAddress,
        position: position,
        positionMint: positionMint,
        positionTokenAccount: positionVault,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        user: payer,
      })
      .instruction();

    transaction.add(initializePositionTx);

    return { position: position.toString() };
  }

  async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    const { positionMint, payer, binArrayLower, binArrayUpper, transaction, liquidityDistribution, amountX, amountY } =
      params;

    // const tokenProgramX = await getProgram(this.pairAccount.tokenMintX, this.connection);
    // const tokenProgramY = await getProgram(this.pairAccount.tokenMintY, this.connection);

    const associatedPairVaultX = spl.getAssociatedTokenAddressSync(
      this.pairAccount.tokenMintX,
      this.pairAddress,
      true,
      this.tokenProgramX
    );

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(
      this.pairAccount.tokenMintY,
      this.pairAddress,
      true,
      this.tokenProgramY
    );

    const associatedUserVaultX = spl.getAssociatedTokenAddressSync(
      this.pairAccount.tokenMintX,
      payer,
      true,
      this.tokenProgramX
    );

    const associatedUserVaultY = spl.getAssociatedTokenAddressSync(
      this.pairAccount.tokenMintY,
      payer,
      true,
      this.tokenProgramY
    );

    if (
      this.pairAccount.tokenMintY.toString() === WRAP_SOL_ADDRESS ||
      this.pairAccount.tokenMintX.toString() === WRAP_SOL_ADDRESS
    ) {
      const isNativeY = this.pairAccount.tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const totalAmount = isNativeY ? amountY : amountX;
      const totalLiquid = liquidityDistribution.reduce((prev, curr) => {
        const currAmount = isNativeY ? curr.distributionY : curr.distributionX;
        return prev + currAmount;
      }, 0);

      if (totalLiquid) {
        const amount = (totalLiquid * totalAmount) / MAX_BASIS_POINTS;

        const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: amount,
          })
        );
        transaction.add(spl.createSyncNativeInstruction(associatedUserVault));
      }
    }

    const unitSPrice = await getGasPrice(this.connection).catch(() => undefined);
    const unitPrice = Math.max(Number(unitSPrice) ?? 0, UNIT_PRICE_DEFAULT * (this.bufferGas ?? 1));

    const hook = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('hook')), this.hooksConfig.toBuffer(), this.pairAddress.toBuffer()],
      this.hooksProgram.programId
    )[0];

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);

    const addLiquidityInstructions = await this.lbProgram.methods
      .increasePosition(new BN(amountX), new BN(amountY), liquidityDistribution)
      .accountsPartial({
        pair: this.pairAddress,
        position: position,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        tokenVaultX: associatedPairVaultX,
        tokenVaultY: associatedPairVaultY,
        userVaultX: associatedUserVaultX,
        userVaultY: associatedUserVaultY,
        positionTokenAccount: positionVault,
        tokenMintX: this.pairAccount.tokenMintX,
        tokenMintY: this.pairAccount.tokenMintY,
        tokenProgramX: this.tokenProgramX,
        tokenProgramY: this.tokenProgramY,
        positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        hook: hook,
        hooksProgram: this.hooksProgram.programId,
        user: payer,
        positionMint,
      })
      .remainingAccounts([
        { pubkey: this.pairAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: CCU_LIMIT,
      })
    );
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: unitPrice,
      })
    );

    transaction.add(addLiquidityInstructions);
  }

  public async removeMultipleLiquidity(
    params: RemoveMultipleLiquidityParams
  ): Promise<RemoveMultipleLiquidityResponse> {
    const { maxPositionList, payer, type } = params;

    const tokenMintX = this.pairAccount.tokenMintX;
    const tokenMintY = this.pairAccount.tokenMintY;

    const tokenProgramX = await getProgram(tokenMintX, this.connection);
    const tokenProgramY = await getProgram(tokenMintY, this.connection);

    const txCreateAccount = new Transaction();

    const associatedPairVaultX = spl.getAssociatedTokenAddressSync(tokenMintX, this.pairAddress, true, tokenProgramX);

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(tokenMintY, this.pairAddress, true, tokenProgramY);

    const associatedUserVaultX = spl.getAssociatedTokenAddressSync(tokenMintX, payer, true, tokenProgramX);

    const associatedUserVaultY = spl.getAssociatedTokenAddressSync(tokenMintY, payer, true, tokenProgramY);

    const infoUserVaultX = await this.connection.getAccountInfo(associatedUserVaultX);
    if (!infoUserVaultX) {
      const userVaultXInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultX,
        payer,
        tokenMintX,
        tokenProgramX
      );
      txCreateAccount.add(userVaultXInstructions);
    }

    const infoUserVaultY = await this.connection.getAccountInfo(associatedUserVaultY);
    if (!infoUserVaultY) {
      const userVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultY,
        payer,
        tokenMintY,
        tokenProgramY
      );
      txCreateAccount.add(userVaultYInstructions);
    }

    const hook = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('hook')), this.hooksConfig!.toBuffer(), this.pairAddress.toBuffer()],
      this.hooksProgram.programId
    )[0];

    const associatedHookTokenY = spl.getAssociatedTokenAddressSync(tokenMintY, hook, true, tokenProgramY);
    const infoHookTokenY = await this.connection.getAccountInfo(associatedHookTokenY);

    if (!infoHookTokenY) {
      const hookTokenYInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedHookTokenY,
        hook,
        tokenMintY,
        tokenProgramY
      );

      txCreateAccount.add(hookTokenYInstructions);
    }

    const unitSPrice = await getGasPrice(this.connection).catch(() => undefined);

    const unitPrice = Math.max(Number(unitSPrice) ?? 0, UNIT_PRICE_DEFAULT * (this.bufferGas ?? 1));

    const positionClosed: Record<string, string>[] = [];
    const txs = await Promise.all(
      maxPositionList.map(async ({ position, start, end, positionMint }) => {
        const binArrayIndex = Math.floor(start / BIN_ARRAY_SIZE);

        const { resultIndex } = await this.getBinArrayInfo({
          binArrayIndex,
          pair: this.pairAddress,
          payer,
        });

        const binArrayLower = await this.getBinArray({
          binArrayIndex: resultIndex,
          pair: this.pairAddress,
          payer,
        });

        const binArrayUpper = await this.getBinArray({
          binArrayIndex: resultIndex + 1,
          pair: this.pairAddress,
          payer,
        });

        const tx = new Transaction();
        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: CCU_LIMIT,
          })
        );
        tx.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: unitPrice,
          })
        );

        const positionVault = spl.getAssociatedTokenAddressSync(
          new PublicKey(positionMint),
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = cloneDeep(
          await this.getBinsReserveInformation({
            position: new PublicKey(position),
            pair: this.pairAddress,
            payer,
          })
        );

        const hookBinArrayLower = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode('bin_array')),
            hook.toBuffer(),
            new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, 'le', 4),
          ],
          this.hooksProgram.programId
        )[0];

        const hookBinArrayUpper = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode('bin_array')),
            hook.toBuffer(),
            new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, 'le', 4),
          ],
          this.hooksProgram.programId
        )[0];

        const hookPosition = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), new PublicKey(position).toBuffer()],
          this.hooksProgram.programId
        )[0];

        let removedShares: BN[] = [];

        if (type === 'removeBoth') {
          removedShares = reserveXY.map((reserve: BinReserveInfo) => {
            const binId = reserve.binId;
            if (binId >= Number(start) && binId <= Number(end)) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        if (type === 'removeBaseToken') {
          removedShares = reserveXY.map((reserve: BinReserveInfo) => {
            if (reserve.reserveX && reserve.reserveY === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        if (type === 'removeQuoteToken') {
          removedShares = reserveXY.map((reserve: BinReserveInfo) => {
            if (reserve.reserveY && reserve.reserveX === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        const availableShares = reserveXY.filter((item: BinReserveInfo) =>
          type === 'removeBoth'
            ? !item.liquidityShare.isZero()
            : type === 'removeQuoteToken'
              ? !item.reserveX
              : !item.reserveY
        );

        const isClosePosition =
          (type === 'removeBoth' && end - start + 1 >= availableShares.length) ||
          (end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH);
        if (isClosePosition) {
          const instructions = await this.lbProgram.methods
            .closePosition()
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX,
              tokenMintY,
              tokenProgramX,
              tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          positionClosed.push({ position });
          tx.add(instructions);
        } else {
          const instructions = await this.lbProgram.methods
            .decreasePosition(removedShares)
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX: tokenMintX,
              tokenMintY: tokenMintY,
              tokenProgramX,
              tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook: hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            ?.remainingAccounts([
              { pubkey: this.pairAddress, isWritable: false, isSigner: false },
              { pubkey: binArrayLower, isWritable: false, isSigner: false },
              { pubkey: binArrayUpper, isWritable: false, isSigner: false },
              { pubkey: hookBinArrayLower, isWritable: true, isSigner: false },
              { pubkey: hookBinArrayUpper, isWritable: true, isSigner: false },
              { pubkey: hookPosition, isWritable: true, isSigner: false },
            ])
            .instruction();

          tx.add(instructions);
        }

        return tx;
      })
    );

    const txCloseAccount = new Transaction();

    if (tokenMintY.toString() === WRAP_SOL_ADDRESS || tokenMintX.toString() === WRAP_SOL_ADDRESS) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      txCloseAccount.add(spl.createCloseAccountInstruction(associatedUserVault, payer, payer));
    }

    return {
      txs,
      txCreateAccount: txCreateAccount.instructions.length ? txCreateAccount : undefined,
      txCloseAccount: txCloseAccount.instructions.length ? txCloseAccount : undefined,
      positionClosed,
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get all positions for a user that belong to this pair
   */
  public async getUserPositions(payer: PublicKey) {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(payer, {
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });

    const positionMints = tokenAccounts.value
      .filter((acc) => {
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        // Only interested in NFTs or position tokens with amount > 0
        return amount && amount > 0;
      })
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

    const positions = await Promise.all(
      positionMints.map(async (mint) => {
        // Derive PDA for Position account
        const [positionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), mint.toBuffer()],
          this.lbProgram.programId
        );
        // Fetch and decode the Position account
        try {
          const accountInfo = await this.connection.getAccountInfo(positionPda);
          if (!accountInfo) return null;
          //@ts-ignore
          const position = await this.lbProgram.account.position.fetch(positionPda);
          if (position.pair.toString() !== this.pairAddress.toString()) return null;
          return { ...position, position: positionPda.toString() };
        } catch {
          return null;
        }
      })
    );
    return positions.filter(Boolean);
  }

  async getBinArray(params: GetBinArrayParams) {
    const { binArrayIndex, payer, transaction } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        this.pairAddress.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      this.lbProgram.programId
    )[0];

    if (transaction && payer) {
      const binArrayInfo = await this.connection.getAccountInfo(binArray);

      if (!binArrayInfo) {
        const initializebinArrayConfigTx = await this.lbProgram.methods
          .initializeBinArray(binArrayIndex)
          .accountsPartial({ pair: this.pairAddress, binArray: binArray, user: payer })
          .instruction();
        transaction.add(initializebinArrayConfigTx);
      }
    }

    return binArray;
  }

  public async getBinArrayInfo(params: GetBinsArrayInfoParams) {
    const { binArrayIndex, payer } = params;
    let resultIndex = binArrayIndex;
    let result = [];

    const binArray = await this.getBinArray({
      binArrayIndex,
      pair: this.pairAddress,
      payer,
    });

    //@ts-ignore
    const { bins } = await this.lbProgram.account.binArray.fetch(binArray);
    try {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex + 1,
        pair: this.pairAddress,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);

      result = [...bins, ...res.bins];
    } catch {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex - 1,
        pair: this.pairAddress,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);
      result = [...res.bins, ...bins];
      resultIndex -= 1;
    }

    return { bins: result, resultIndex };
  }

  public async getBinsReserveInformation(params: GetBinsReserveParams): Promise<BinReserveInfo[]> {
    const { position, payer } = params;
    //@ts-ignore
    const positionInfo = await this.lbProgram.account.position.fetch(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    const { bins, resultIndex } = await this.getBinArrayInfo({
      binArrayIndex,
      pair: this.pairAddress,
      payer,
    });

    const firstBinIndex = resultIndex * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    const reserveXY = binIds.map((binId: number, index: number) => {
      const liquidityShare = positionInfo.liquidityShares[index];
      const activeBin = bins[binId];

      if (activeBin) {
        const totalReserveX = activeBin.reserveX;
        const totalReserveY = activeBin.reserveY;
        const totalSupply = activeBin.totalSupply;
        const reserveX = totalReserveX.gt(new BN(0))
          ? mulDivBN(liquidityShare, totalReserveX, totalSupply, 'down').toNumber()
          : 0;

        const reserveY = totalReserveY.gt(new BN(0))
          ? mulDivBN(liquidityShare, totalReserveY, totalSupply, 'down').toNumber()
          : 0;

        return {
          reserveX: reserveX,
          reserveY: reserveY,
          totalSupply: totalSupply,
          binId: firstBinId + index,
          binPosistion: binId,
          liquidityShare: positionInfo.liquidityShares[index],
        };
      }
      return {
        reserveX: 0,
        reserveY: 0,
        totalSupply: new BN(0),
        binId: firstBinId + index,
        binPosistion: binId,
        liquidityShare,
      };
    });

    return reserveXY;
  }

  // ========== INTERNAL CALCULATION METHODS ==========
  // Do any of these need to be exposed public?
  private async calculateInOutAmount(params: GetTokenOutputParams) {
    const { amount, swapForY, isExactInput } = params;
    try {
      const currentBinArrayIndex = Math.floor(this.pairAccount.activeId / BIN_ARRAY_SIZE);
      const binArrayIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];
      const binArrayAddresses = binArrayIndexes.map((idx) =>
       deriveBinArrayPDA(this.pairAddress, idx, this.lbProgram.programId)

      );

      const binArrays: BinArrayAccount[] = await Promise.all(
        binArrayAddresses.map((address, i) =>
          //@ts-ignore
          this.lbProgram.account.binArray.fetch(address).catch((_error: any) => {
            return { index: binArrayIndexes[i], bins: [] } as BinArrayAccount;
          })
        )
      );

      const binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
      const totalSupply = binRange.getAllBins().reduce((acc, cur) => acc.add(cur.totalSupply), new BN(0));
      if (totalSupply.isZero()) {
        return {
          amountIn: BigInt(0),
          amountOut: BigInt(0),
        };
      }

      const amountAfterTransferFee = amount;

      if (isExactInput) {
        const amountOut = await this.calculateAmountOut(amountAfterTransferFee, binRange, this.pairAccount, swapForY);

        return {
          amountIn: amount,
          amountOut,
        };
      } else {
        const amountIn = await this.calculateAmountIn(amountAfterTransferFee, binRange, this.pairAccount, swapForY);

        return {
          amountIn,
          amountOut: amountAfterTransferFee,
        };
      }
    } catch (error) {
      throw new Error(error as string);
    }
  }

  private async calculateAmountIn(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean) {
    try {
      let amountIn = BigInt(0);
      let amountOutLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatility.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountOutLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatility.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBin(activeId);
        if (!activeBin) {
          break;
        }

        const vol = this.volatility.getVolatilityAccumulator();
        const fee = getTotalFee(pairInfo, vol);

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactOutput({
          binStep: pairInfo.binStep,
          activeId,
          amountOutLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
        });

        amountIn += amountInWithFees;
        amountOutLeft -= amountOutOfBin;

        if (!amountOutLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }

      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw new Error('Quote Failed: Swap crosses too many bins');
      }

      return amountIn;
    } catch (error) {
      throw error;
    }
  }

  private async calculateAmountOut(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean) {
    try {
      let amountOut = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatility.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountInLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatility.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBin(activeId);
        if (!activeBin) {
          break;
        }

        const vol = this.volatility.getVolatilityAccumulator();
        const fee = getTotalFee(pairInfo, vol);

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactInput({
          binStep: pairInfo.binStep,
          activeId,
          amountInLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
        });

        amountOut += amountOutOfBin;
        amountInLeft -= amountInWithFees;

        if (!amountInLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }
      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw new Error('Quote Failed: Swap crosses too many bins');
      }

      return amountOut;
    } catch (error) {
      throw error;
    }
  }

  private swapExactOutput(params: {
    binStep: number;
    activeId: number;
    amountOutLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountOutLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0),
      };
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());
    const amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    const amountInWithoutFee = calcAmountInByPrice(amountOut, priceScaled, SCALE_OFFSET, swapForY, 'up');

    const feeAmount = getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = getProtocolFee(feeAmount, protocolShareBigInt);

    return {
      amountInWithFees: amountIn,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  private swapExactInput(params: {
    binStep: number;
    activeId: number;
    amountInLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountInLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0),
      };
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    let maxAmountIn = calcAmountInByPrice(binReserveOutBigInt, priceScaled, SCALE_OFFSET, swapForY, 'up');

    const maxFeeAmount = getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = calcAmountOutByPrice(amountIn, priceScaled, SCALE_OFFSET, swapForY, 'down');
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount = protocolShare > BigInt(0) ? getProtocolFee(feeAmount, protocolShareBigInt) : BigInt(0);

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  public moveActiveId(pairId: number, swapForY: boolean) {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }
}
