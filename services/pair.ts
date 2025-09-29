import { BN, utils } from '@coral-xyz/anchor';
import {
  AddLiquidityByShapeParams,
  BinArrayAccount,
  CreatePositionResponse,
  Distribution,
  GetPositionReserveParams,
  PositionAccount,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
} from '../types';
import * as spl from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
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
  RemoveLiquidityType,
  SCALE_OFFSET,
  WRAP_SOL_ADDRESS,
} from '../constants';
import {
  AddLiquidityIntoPositionParams,
  PositionBinReserve,
  CreatePositionParams,
  GetBinArrayParams,
  Pair,
  SwapParams,
} from '../types';
import { mulDivBN, mulShr, shlDiv } from '../utils/math';
import { calcAmountInByPrice, calcAmountOutByPrice, getPriceFromId } from '../utils/price';
import { Volatility } from '../utils/volatility';
import { getFeeAmount, getFeeForAmount, getFeeMetadata, getProtocolFee, getTotalFee } from '../utils/fees';
import { BinArrayRange } from '../utils/bin-range';
import { DLMMBase, SarosConfig } from './base';
import { getProgram } from '../utils/token';
import { DLMMError } from '../error';
import { getSuggestedCUPrice, addComputeBudget } from '../utils/transaction';
import { deriveBinArrayPDA, derivePositionPDA, deriveHookPDA, deriveHookBinArrayPDA } from '../utils/pda';
import { closeWSOLIfNeeded, fundAndSyncWSOL } from '../utils/token';
import { PairMetadata } from '../types/pair';
import {
  GetMaxAmountOutWithFeeParams,
  GetMaxAmountOutWithFeeResponse,
  QuoteParams,
  QuoteResponse,
} from '../types/swap';
import { createUniformDistribution } from '../utils';

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
   * Get pair account data
   */
  public getPairAccount(): Pair {
    return this.pairAccount;
  }

  /**
   * Get pair metadata
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
      pair: this.pairAddress,
      tokenX: {
        mintAddress: tokenMintX,
        decimal: reserveX.value.decimals,
        reserve: reserveX.value.amount,
      },
      tokenY: {
        mintAddress: tokenMintY,
        decimal: reserveY.value.decimals,
        reserve: reserveY.value.amount,
      },
      binStep: this.pairAccount.binStep,
      baseFee,
      dynamicFee,
      protocolFee,
      extra: {
        hook: hook || undefined,
      },
    };
  }

  /**
   * Get a quote for a swap on this pair
   */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    try {
      const { tokenX, tokenY } = this.metadata;
      const {
        amount,
        slippage,
        options: { swapForY, isExactInput },
      } = params;

      // throw error if invalid amounts in params
      if (amount <= 0n) throw new DLMMError('Quote amount must be greater than 0', 'ZERO_AMOUNT');
      if (slippage < 0 || slippage >= 100) throw new DLMMError('Invalid slippage percentage', 'INVALID_SLIPPAGE');

      const data = await this.calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      const slippageFraction = slippage / 100;
      const slippageScaled = Math.round(slippageFraction * PRECISION);
      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;
      if (isExactInput) {
        minAmountOut = (amountOut * BigInt(PRECISION - slippageScaled)) / BigInt(PRECISION);
      } else {
        maxAmountIn = (amountIn * BigInt(PRECISION)) / BigInt(PRECISION - slippageScaled);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee({
        amount: amountIn,
        swapForY: swapForY,
        decimalTokenX: tokenX.decimal,
        decimalTokenY: tokenY.decimal,
      });

      const priceImpact = new bigDecimal(amountOut.toString())
        .subtract(new bigDecimal(maxAmountOut.toString()))
        .divide(new bigDecimal(maxAmountOut.toString()))
        .multiply(new bigDecimal(100))
        .getValue();

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: isExactInput ? maxAmountIn : minAmountOut,
        minTokenOut: isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: Number(priceImpact),
      };
    } catch (error) {
      throw error;
    }
  }

  // kept public as before
  public async getMaxAmountOutWithFee(params: GetMaxAmountOutWithFeeParams): Promise<GetMaxAmountOutWithFeeResponse> {
    try {
      const { amount, swapForY = false, decimalTokenX = 9, decimalTokenY = 9 } = params;

      let amountIn = BigInt(amount);
      const activeId = this.pairAccount.activeId;
      const binStep = this.pairAccount.binStep;
      const feePrice = getTotalFee(this.pairAccount, 0);
      const activePrice = getPriceFromId(binStep, activeId, decimalTokenX, decimalTokenY);
      const price = getPriceFromId(binStep, activeId, decimalTokenX, decimalTokenY);

      const feeAmount = getFeeAmount(amountIn, feePrice);
      amountIn -= BigInt(feeAmount);

      const maxAmountOut = swapForY
        ? mulShr(Number(amountIn.toString()), activePrice, SCALE_OFFSET, 'down')
        : shlDiv(Number(amountIn.toString()), activePrice, SCALE_OFFSET, 'down');

      return { maxAmountOut: BigInt(maxAmountOut), price };
    } catch (err) {
      throw new DLMMError(
        `Failed to calculate max amount out: ${(err as Error).message ?? err}`,
        'QUOTE_CALCULATION_FAILED'
      );
    }
  }

  public async swap(params: SwapParams): Promise<Transaction> {
    const {
      tokenIn: tokenMintX,
      tokenOut: tokenMintY,
      amount,
      minTokenOut: otherAmountOffset,
      options: { swapForY, isExactInput },
      payer,
      hook,
    } = params;

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
      throw new DLMMError('No valid bin arrays found for the pair', 'INVALID_BIN_ARRAYS');
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

    const associatedPairVaultX = this.tokenVaultX!;
    const associatedPairVaultY = this.tokenVaultY!;

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
        fundAndSyncWSOL(tx, payer, associatedUserVault, Number(amount));
      }

      if (!isNativeY && swapForY) {
        fundAndSyncWSOL(tx, payer, associatedUserVault, Number(amount));
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
        hook: hook || this.hooksConfig, // fallback to hooksConfig if none provided
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
      const mint = isNativeY ? tokenMintY : tokenMintX;
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        closeWSOLIfNeeded(tx, mint, associatedUserVault, payer);
      }
    }

    return tx;
  }

  // ========== LIQUIDITY METHODS ==========
  async createPosition(params: CreatePositionParams): Promise<CreatePositionResponse> {
    const { payer, binIdLeft, binIdRight, positionMint, transaction } = params;

    const txn = transaction || new Transaction();

    const position = derivePositionPDA(positionMint, this.lbProgram.programId);

    const positionVault = spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);

    const firstBinId = this.pairAccount.activeId + binIdLeft;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    await this.getBinArray({ binArrayIndex, pair: this.pairAddress, payer });
    await this.getBinArray({ binArrayIndex: binArrayIndex + 1, pair: this.pairAddress, payer });

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

    txn.add(initializePositionTx);

    return { position: position, transaction: txn };
  }

  /**
   * Add liquidity to this pair using a shape distribution
   * (delegates to addLiquidityIntoPosition)
   */
  async addLiquidityByShape(params: AddLiquidityByShapeParams): Promise<Transaction> {
    const { positionMint, payer, transaction: userTxn, amountTokenX, amountTokenY, liquidityShape, binRange } = params;

    if (amountTokenX <= 0n && amountTokenY <= 0n) {
      throw new DLMMError('Cannot add zero liquidity', 'CANNOT_ADD_ZERO');
    }

    const tx = userTxn || new Transaction();

    // Build liquidity distribution from shape + range
    const liquidityDistribution: Distribution[] = createUniformDistribution({
      shape: liquidityShape,
      binRange,
    });

    const lowerBinId = this.pairAccount.activeId + binRange[0];
    const upperBinId = this.pairAccount.activeId + binRange[1];

    // Ensure bin arrays exist; pass `transaction: tx` so init ixs land on the same tx
    const binArrayLower = await this.getBinArray({
      binArrayIndex: Math.floor(lowerBinId / BIN_ARRAY_SIZE),
      pair: this.pairAddress,
      payer,
      transaction: tx,
    });
    const binArrayUpper = await this.getBinArray({
      binArrayIndex: Math.floor(upperBinId / BIN_ARRAY_SIZE),
      pair: this.pairAddress,
      payer,
      transaction: tx,
    });

    // Delegate to the single code path
    await this.addLiquidityIntoPosition({
      positionMint,
      payer,
      binArrayLower,
      binArrayUpper,
      transaction: tx,
      liquidityDistribution,
      amountX: amountTokenX, // bigint accepted by wrapper
      amountY: amountTokenY, // bigint accepted by wrapper
    });

    return tx;
  }

  async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    const { positionMint, payer, binArrayLower, binArrayUpper, transaction, liquidityDistribution, amountX, amountY } =
      params;

    const associatedPairVaultX = this.tokenVaultX!;
    const associatedPairVaultY = this.tokenVaultY!;

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

      const totalAmountBig = isNativeY ? amountY : amountX;
      const totalLiquid = liquidityDistribution.reduce((prev, curr) => {
        const currAmount = isNativeY ? curr.distributionY : curr.distributionX;
        return prev + currAmount;
      }, 0);
      if (totalLiquid) {
        const amountForWSOL = (BigInt(totalLiquid) * totalAmountBig) / BigInt(MAX_BASIS_POINTS);
        const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
        fundAndSyncWSOL(transaction, payer, associatedUserVault, Number(amountForWSOL));
      }
    }

    const unitPrice = await getSuggestedCUPrice(this.connection, this.bufferGas);
    const hook = deriveHookPDA(this.hooksConfig, this.pairAddress, this.hooksProgram.programId);
    const position = derivePositionPDA(positionMint, this.lbProgram.programId);
    const positionVault = spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);

    const addLiquidityInstructions = await this.lbProgram.methods
      .increasePosition(new BN(amountX.toString()), new BN(amountY.toString()), liquidityDistribution)
      .accountsPartial({
        pair: this.pairAddress,
        position,
        binArrayLower,
        binArrayUpper,
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
        hook,
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

    addComputeBudget(transaction, CCU_LIMIT, unitPrice);
    transaction.add(addLiquidityInstructions);
  }

  /**
   * Remove liquidity from one or more positions in this pair
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const { positionMints, payer, type } = params;
    const { tokenMintX, tokenMintY } = this.pairAccount;

    const tokenProgramX = this.tokenProgramX!;
    const tokenProgramY = this.tokenProgramY!;

    const txCreateAccount = new Transaction();

    const associatedPairVaultX = this.tokenVaultX!;
    const associatedPairVaultY = this.tokenVaultY!;

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

    const hook = deriveHookPDA(this.hooksConfig!, this.pairAddress, this.hooksProgram.programId);

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

    const unitPrice = await getSuggestedCUPrice(this.connection, this.bufferGas);

    const closedPositions: PublicKey[] = [];
    const transactions = await Promise.all(
      positionMints.map(async (positionMint) => {
        const position = derivePositionPDA(positionMint, this.lbProgram.programId);

        // Fetch the on-chain position account
        // @ts-ignore
        const positionAccount = await this.lbProgram.account.position.fetch(position);

        const binArrayIndex = Math.floor(positionAccount.lowerBinId / BIN_ARRAY_SIZE);

        // Use BinArrayRange to fetch the bin arrays around this index
        const binArrayRange = await BinArrayRange.fromIndex(
          this.lbProgram,
          this.connection,
          this.pairAddress,
          binArrayIndex
        );

        // Pick lower/upper directly relative to the starting binArrayIndex
        const binArrayLower = await this.getBinArray({
          binArrayIndex,
          pair: this.pairAddress,
          payer,
        });

        const binArrayUpper = await this.getBinArray({
          binArrayIndex: binArrayIndex + 1,
          pair: this.pairAddress,
          payer,
        });

        const tx = new Transaction();
        addComputeBudget(tx, CCU_LIMIT, unitPrice);

        const positionVault = spl.getAssociatedTokenAddressSync(
          new PublicKey(positionMint),
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = cloneDeep(
          await this.getPositionReserves({
            position: new PublicKey(position),
            payer,
          })
        );

        const hookBinArrayLower = deriveHookBinArrayPDA(hook, BIN_ARRAY_INDEX, this.hooksProgram.programId);
        const hookBinArrayUpper = deriveHookBinArrayPDA(hook, BIN_ARRAY_INDEX + 1, this.hooksProgram.programId);

        const hookPosition = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), new PublicKey(position).toBuffer()],
          this.hooksProgram.programId
        )[0];

        let removedShares: BN[] = [];

        if (type === RemoveLiquidityType.All) {
          removedShares = reserveXY.map((reserve: PositionBinReserve) => {
            if (reserve.binId >= positionAccount.lowerBinId && reserve.binId <= positionAccount.upperBinId) {
              return reserve.liquidityShare;
            }
            return new BN(0);
          });
        }

        if (type === RemoveLiquidityType.TokenX) {
          removedShares = reserveXY.map((reserve: PositionBinReserve) => {
            if (reserve.reserveX && reserve.reserveY === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        if (type === RemoveLiquidityType.TokenY) {
          removedShares = reserveXY.map((reserve: PositionBinReserve) => {
            if (reserve.reserveY && reserve.reserveX === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        const availableShares = reserveXY.filter((item: PositionBinReserve) =>
          type === RemoveLiquidityType.All
            ? !item.liquidityShare.isZero()
            : type === RemoveLiquidityType.TokenY
              ? !item.reserveX
              : !item.reserveY
        );

        const isClosePosition =
          (type === RemoveLiquidityType.All &&
            positionAccount.upperBinId - positionAccount.lowerBinId + 1 >= availableShares.length) ||
          (positionAccount.upperBinId - positionAccount.lowerBinId + 1 === FIXED_LENGTH &&
            availableShares.length === FIXED_LENGTH);

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

          closedPositions.push(position);
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
      const mint = isNativeY ? tokenMintY : tokenMintX;
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      closeWSOLIfNeeded(txCloseAccount, mint, associatedUserVault, payer);
    }

    return {
      setupTransaction: txCreateAccount.instructions.length ? txCreateAccount : undefined,
      transactions,
      cleanupTransaction: txCloseAccount.instructions.length ? txCloseAccount : undefined,
      closedPositions,
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get all positions for a user that belong to this pair
   */
  public async getUserPositions(payer: PublicKey): Promise<PositionAccount[]> {
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

  public async getBinArray(params: GetBinArrayParams): Promise<PublicKey> {
    const { binArrayIndex, payer, transaction } = params;

    const binArray = deriveBinArrayPDA(this.pairAddress, binArrayIndex, this.lbProgram.programId);

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

  public async getPositionReserves(params: GetPositionReserveParams): Promise<PositionBinReserve[]> {
    const { position, payer } = params;
    // @ts-ignore
    const positionInfo = await this.lbProgram.account.position.fetch(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    const binArrayRange = await BinArrayRange.fromIndex(
      this.lbProgram,
      this.connection,
      this.pairAddress,
      binArrayIndex
    );

    const binIds = Array.from({ length: positionInfo.upperBinId - firstBinId + 1 }, (_, i) => firstBinId + i);

    return binIds.map((binId: number, index: number) => {
      const liquidityShare = positionInfo.liquidityShares[index];
      let reserveX = 0;
      let reserveY = 0;
      let totalSupply = new BN(0);

      try {
        const activeBin = binArrayRange.getBin(binId);
        totalSupply = activeBin.totalSupply;

        if (activeBin.reserveX.gt(new BN(0))) {
          reserveX = mulDivBN(liquidityShare, activeBin.reserveX, totalSupply, 'down').toNumber();
        }
        if (activeBin.reserveY.gt(new BN(0))) {
          reserveY = mulDivBN(liquidityShare, activeBin.reserveY, totalSupply, 'down').toNumber();
        }
      } catch {
        // leave reserves at 0
      }

      return {
        reserveX,
        reserveY,
        totalSupply,
        binId,
        liquidityShare,
      };
    });
  }

  // ========== INTERNAL CALCULATION METHODS ==========
  // Do any of these need to be exposed public?
  private async calculateInOutAmount(params: QuoteParams) {
    try {
      const {
        amount,
        options: { swapForY, isExactInput },
      } = params;
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

      const binRange = new BinArrayRange([binArrays[0], binArrays[1], binArrays[2]]);
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
        throw new DLMMError('Quote Failed: Swap crosses too many bins', 'MAX_BIN_CROSSINGS_EXCEEDED');
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
        throw new DLMMError('Quote Failed: Swap crosses too many bins', 'MAX_BIN_CROSSINGS_EXCEEDED');
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

    const price = getPriceFromId(binStep, activeId, this.metadata.tokenX.decimal, this.metadata.tokenY.decimal);
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

    const price = getPriceFromId(binStep, activeId, this.metadata.tokenX.decimal, this.metadata.tokenY.decimal);
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
