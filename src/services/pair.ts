import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { SarosBaseService, SarosConfig } from './base/index';
import { BinArrays } from '../utils/bin-arrays';
import { Liquidity } from '../utils/liquidity';
import { Fees } from '../utils/fees';
import { Volatility } from '../utils/volatility';
import { BinArrayRange } from '../utils/bin-range';
import { BIN_ARRAY_SIZE, MAX_BIN_CROSSINGS, SCALE_OFFSET, WRAP_SOL_PUBKEY } from '../constants';
import {
  DLMMPairAccount,
  PairMetadata,
  QuoteResponse,
  BinArray,
  RemoveLiquidityResponse,
  PositionAccount,
  PositionReserve,
  GetMaxAmountOutWithFeeResponse,
  QuoteParams,
  SwapParams,
  GetMaxAmountOutWithFeeParams,
  GetBinArrayReserversParams,
  GetPositionReservesParams,
  CreatePositionParams,
  AddLiquidityByShapeParams,
  RemoveLiquidityParams,
} from '../types';
import { getPriceFromId } from '../utils/price';
import { getPairTokenAccounts, getUserVaults } from '../utils/vault-accounts';
import { SarosDLMMError } from '../utils/errors';
import {
  getAmountInByPrice,
  getAmountOutByPrice,
  getPriceImpact,
  getMinOutputWithSlippage,
  getMaxInputWithSlippage,
} from '../utils/calculations';
import { addSolTransferInstructions, addOptimalComputeBudget } from '../utils/transaction';
import { createUniformDistribution, Distribution, calculateDistributionAmounts } from '../utils/bin-distribution';
import { Hooks } from '../utils/hooks';
import { Positions } from '../utils/positions';
import { handleSolWrapping } from '../utils/transaction';

export class SarosDLMMPair extends SarosBaseService {
  private pairAddress: PublicKey;
  private pairAccount!: DLMMPairAccount;
  private metadata!: PairMetadata;
  private volatilityManager: Volatility;
  bufferGas?: number;

  private tokenProgramX?: PublicKey;
  private tokenProgramY?: PublicKey;
  private tokenVaultX?: PublicKey;
  private tokenVaultY?: PublicKey;

  constructor(config: SarosConfig, pairAddress: PublicKey) {
    super(config);
    this.pairAddress = pairAddress;
    this.volatilityManager = new Volatility();
  }

  /**
   * Get pair metadata
   */
  public getPairMetadata(): PairMetadata {
    return this.metadata;
  }

  /**
   * Get pair account data
   */
  public getPairAccount(): DLMMPairAccount {
    return this.pairAccount;
  }

  /**
   * Get pair address
   */
  public getPairAddress(): PublicKey {
    return this.pairAddress;
  }

  /**
   * Refresh pair data
   */
  public async refetchState(): Promise<void> {
    try {
      //@ts-ignore
      this.pairAccount = await this.lbProgram.account.pair.fetch(this.pairAddress);
      if (!this.pairAccount) throw SarosDLMMError.PairFetchFailed;

      this.metadata = await this.buildPairMetadata();
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.PairFetchFailed);
    }
  }

  private async buildPairMetadata(): Promise<PairMetadata> {
    const { tokenMintX, tokenMintY, hook } = this.pairAccount;

    const tokenAccountsData = await getPairTokenAccounts(tokenMintX, tokenMintY, this.pairAddress, this.connection);

    // Store results
    this.tokenVaultX = tokenAccountsData.vaultX;
    this.tokenVaultY = tokenAccountsData.vaultY;
    this.tokenProgramX = tokenAccountsData.tokenProgramX;
    this.tokenProgramY = tokenAccountsData.tokenProgramY;

    const { binStep, staticFeeParameters, dynamicFeeParameters } = this.pairAccount;
    const feeInfo = Fees.calculateFeePercentages(binStep, staticFeeParameters, dynamicFeeParameters);

    return {
      pair: this.pairAddress,
      tokenX: {
        mintAddress: tokenMintX,
        decimals: tokenAccountsData.baseDecimals,
        reserve: tokenAccountsData.reserveX.value.amount,
      },
      tokenY: {
        mintAddress: tokenMintY,
        decimals: tokenAccountsData.quoteDecimals,
        reserve: tokenAccountsData.reserveY.value.amount,
      },
      binStep,
      baseFee: feeInfo.baseFee,
      dynamicFee: feeInfo.dynamicFee,
      protocolFee: feeInfo.protocolFee,
      extra: { hook: hook || undefined },
    };
  }

  /**
   * Get a quote for a swap on this pair
   */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    if (params.amount <= 0n) throw SarosDLMMError.ZeroAmount;
    if (params.slippage < 0 || params.slippage >= 100) throw SarosDLMMError.InvalidSlippage;

    try {
      const { tokenX, tokenY } = this.metadata;
      const {
        slippage,
        options: { swapForY, isExactInput },
      } = params;

      const data = await this.calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;

      if (isExactInput) {
        minAmountOut = getMinOutputWithSlippage(amountOut, slippage);
      } else {
        maxAmountIn = getMaxInputWithSlippage(amountIn, slippage);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee({
        amount: amountIn,
        swapForY,
        decimalTokenX: tokenX.decimals,
        decimalTokenY: tokenY.decimals,
      });

      const priceImpact = getPriceImpact(amountOut, maxAmountOut);

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: isExactInput ? maxAmountIn : minAmountOut,
        minTokenOut: isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: priceImpact,
      };
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.QuoteCalculationFailed);
    }
  }

  /**
   * Execute a swap transaction on this pair
   */
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

    if (amount <= 0n) throw SarosDLMMError.ZeroAmount;
    if (otherAmountOffset < 0n) throw SarosDLMMError.ZeroAmount;

    const tokenVaultX = this.tokenVaultX;
    const tokenVaultY = this.tokenVaultY;
    // Use provided hook or default to instance hook config
    const hookConfig = hook || this.hooksConfig;

    const { binArrayLower, binArrayUpper } = await BinArrays.getSwapBinArrays(
      this.pairAccount.activeId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId
    );

    const latestBlockHash = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    const { userVaultX, userVaultY } = await getUserVaults(tokenMintX, tokenMintY, payer, this.connection, tx);

    handleSolWrapping(tx, tokenMintX, tokenMintY, userVaultX, userVaultY, payer, {
      swapForY,
      amount,
      isPreSwap: true,
    });

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
        tokenVaultX,
        tokenVaultY,
        userVaultX,
        userVaultY,
        tokenMintX: tokenMintX,
        tokenMintY: tokenMintY,
        tokenProgramX: this.tokenProgramX,
        tokenProgramY: this.tokenProgramY,
        user: payer,
        hook: hookConfig,
        hooksProgram: this.hooksProgram.programId,
      })
      .remainingAccounts([
        { pubkey: this.pairAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    handleSolWrapping(tx, tokenMintX, tokenMintY, userVaultX, userVaultY, payer, {
      swapForY,
      isPreSwap: false,
    });

    return tx;
  }

  /**
   * Calculate maximum output
   */
  public async getMaxAmountOutWithFee(params: GetMaxAmountOutWithFeeParams): Promise<GetMaxAmountOutWithFeeResponse> {
    try {
      const { amount, swapForY = false, decimalTokenX: decimalBase = 9, decimalTokenY: decimalQuote = 9 } = params;
      if (amount <= 0n) throw SarosDLMMError.ZeroAmount;

      const { activeId, binStep } = this.pairAccount;

      const feePrice = Fees.getTotalFee(this.pairAccount, this.volatilityManager.getVolatilityAccumulator());
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(binStep, activeId, decimalBase, decimalQuote);

      const feeAmount = Fees.getFeeAmount(amount, feePrice);
      const amountAfterFee = amount - feeAmount;
      const maxAmountOut = swapForY
        ? (amountAfterFee * BigInt(activePrice)) >> BigInt(SCALE_OFFSET)
        : (amountAfterFee << BigInt(SCALE_OFFSET)) / BigInt(activePrice);

      return { maxAmountOut, price };
    } catch {
      return { maxAmountOut: 0n, price: 0 };
    }
  }

  private async calculateInOutAmount(params: QuoteParams) {
    const {
      amount,
      options: { swapForY, isExactInput },
    } = params;
    try {
      const { binArrays } = await BinArrays.getQuoteBinArrays(
        this.pairAccount.activeId,
        this.pairAddress,
        this.lbProgram
      );

      const binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
      const totalSupply = binRange
        .getAllBins()
        .reduce((acc, cur) => acc.add(new BN(cur.totalSupply.toString())), new BN(0));
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
      SarosDLMMError.handleError(error, SarosDLMMError.QuoteCalculationFailed);
    }
  }

  private async calculateAmountIn(amount: bigint, bins: BinArrayRange, pairInfo: DLMMPairAccount, swapForY: boolean) {
    try {
      let amountIn = BigInt(0);
      let amountOutLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatilityManager.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountOutLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatilityManager.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const volatility = this.volatilityManager.getVolatilityAccumulator();
        const fee = Fees.getTotalFee(pairInfo, volatility);

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactOutput({
          binStep: pairInfo.binStep,
          activeId,
          amountOutLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: new BN(activeBin.reserveX.toString()),
          reserveY: new BN(activeBin.reserveY.toString()),
        });

        amountIn += amountInWithFees;
        amountOutLeft -= amountOutOfBin;

        if (!amountOutLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }

      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw SarosDLMMError.SwapExceedsMaxBinCrossings;
      }

      return amountIn;
    } catch (error) {
      throw error;
    }
  }

  private async calculateAmountOut(amount: bigint, bins: BinArrayRange, pairInfo: DLMMPairAccount, swapForY: boolean) {
    try {
      let amountOut = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatilityManager.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountInLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatilityManager.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const fee = Fees.getTotalFee(pairInfo, this.volatilityManager.getVolatilityAccumulator());

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactInput({
          binStep: pairInfo.binStep,
          activeId,
          amountInLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: new BN(activeBin.reserveX.toString()),
          reserveY: new BN(activeBin.reserveY.toString()),
        });

        amountOut += amountOutOfBin;
        amountInLeft -= amountInWithFees;

        if (!amountInLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }
      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw SarosDLMMError.SwapExceedsMaxBinCrossings;
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
      throw SarosDLMMError.BinHasNoReserves;
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());
    const amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    const amountInWithoutFee = getAmountInByPrice(amountOut, priceScaled, swapForY, 'up');

    const feeAmount = Fees.getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = Fees.getProtocolFee(feeAmount, protocolShareBigInt);

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
      throw SarosDLMMError.BinHasNoReserves;
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    let maxAmountIn = getAmountInByPrice(binReserveOutBigInt, priceScaled, swapForY, 'up');

    const maxFeeAmount = Fees.getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = Fees.getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = getAmountOutByPrice(amountIn, priceScaled, swapForY, 'down');
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount =
      protocolShare > BigInt(0) ? Fees.getProtocolFee(feeAmount, protocolShareBigInt) : BigInt(0);

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  private moveActiveId(pairId: number, swapForY: boolean): number {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }

  /**
   * Get position account data by position address
   */
  public async getPositionAccount(position: PublicKey): Promise<PositionAccount> {
    //@ts-ignore
    return await this.lbProgram.account.position.fetch(position);
  }

  /**
   * Get bin array information for this pair
   */
  public async getBinArrayReserves(params: GetBinArrayReserversParams): Promise<BinArray> {
    const { binArrayIndex } = params;

    try {
      return await BinArrays.getBinArrayWithAdjacent(binArrayIndex, this.pairAddress, this.lbProgram);
    } catch (_error) {
      throw SarosDLMMError.BinArrayInfoFailed;
    }
  }

  /**
   * Get detailed token balances for each bin in a position
   */
  public async getPositionReserves(params: GetPositionReservesParams): Promise<PositionReserve[]> {
    const { position, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = BinArrays.calculateBinArrayIndex(firstBinId);

    const { bins, index } = await this.getBinArrayReserves({ binArrayIndex, payer });

    const firstBinIndex = index * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    return binIds.map((binId: number, idx: number) => {
      const liquidityShare = positionInfo.liquidityShares[idx];
      const activeBin = bins[binId];

      if (activeBin) {
        const { reserveX, reserveY, totalSupply } = activeBin;

        const baseReserve =
          reserveX.gt(new BN(0)) && totalSupply.gt(new BN(0))
            ? liquidityShare.mul(reserveX).div(totalSupply)
            : new BN(0);

        const quoteReserve =
          reserveY.gt(new BN(0)) && totalSupply.gt(new BN(0))
            ? liquidityShare.mul(reserveY).div(totalSupply)
            : new BN(0);

        return {
          baseReserve: BigInt(baseReserve.toString()),
          quoteReserve: BigInt(quoteReserve.toString()),
          totalSupply: BigInt(totalSupply.toString()),
          binId: firstBinId + idx,
          binPosition: binId,
          liquidityShare: BigInt(liquidityShare.toString()),
        };
      }

      return {
        baseReserve: 0n,
        quoteReserve: 0n,
        totalSupply: 0n,
        binId: firstBinId + idx,
        binPosition: binId,
        liquidityShare: BigInt(liquidityShare.toString()),
      };
    });
  }

  /**
   * Create a new position in this pair
   */
  async createPosition(params: CreatePositionParams): Promise<Transaction> {
    const { payer, binRange, positionMint } = params;
    const [binIdLeft, binIdRight] = binRange;
    const activeBinId = this.pairAccount.activeId;
    const lowerBinId = activeBinId + binIdLeft;
    const upperBinId = activeBinId + binIdRight;

    const transaction = new Transaction();

    await BinArrays.getLiquidityBinArrays(
      lowerBinId,
      upperBinId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId,
      transaction,
      payer,
      this.lbProgram
    );

    const { position, positionVault } = Positions.getPositionAddresses(positionMint, payer, this.lbProgram.programId);

    const ix = await this.lbProgram.methods
      .createPosition(new BN(binIdLeft), new BN(binIdRight))
      .accountsPartial({
        pair: this.pairAddress,
        position,
        positionMint,
        positionTokenAccount: positionVault,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        user: payer,
      })
      .instruction();

    transaction.add(ix);
    return transaction;
  }

  /**
   * Add liquidity to this pair using a shape distribution
   */
  async addLiquidityByShape(params: AddLiquidityByShapeParams): Promise<Transaction> {
    const { positionMint, payer, transaction: userTxn, amountTokenX, amountTokenY, liquidityShape, binRange } = params;

    if (amountTokenX <= 0n && amountTokenY <= 0n) {
      throw SarosDLMMError.CannotAddZero;
    }

    const tx = userTxn || new Transaction();

    const { userVaultX: associatedUserVaultX, userVaultY: associatedUserVaultY } = await getUserVaults(
      this.pairAccount.tokenMintX,
      this.pairAccount.tokenMintY,
      payer,
      this.connection,
      tx
    );

    // Get or create pair vault addresses
    const pairTokenAccounts = await getPairTokenAccounts(
      this.pairAccount.tokenMintX,
      this.pairAccount.tokenMintY,
      this.pairAddress,
      this.connection,
      { payer, transaction: tx, createVaultsIfNeeded: true }
    );
    const associatedPairVaultX = pairTokenAccounts.vaultX;
    const associatedPairVaultY = pairTokenAccounts.vaultY;

    const liquidityDistribution: Distribution[] = createUniformDistribution({
      shape: liquidityShape,
      binRange,
    });

    const lowerBinId = this.pairAccount.activeId + binRange[0];
    const upperBinId = this.pairAccount.activeId + binRange[1];

    const { binArrayLower, binArrayUpper } = await BinArrays.getLiquidityBinArrays(
      lowerBinId,
      upperBinId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId
    );

    if (this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY) || this.pairAccount.tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const { scaledAmount } = calculateDistributionAmounts(
        liquidityDistribution,
        amountTokenX,
        amountTokenY,
        isNativeY
      );

      if (!scaledAmount.isZero()) {
        const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
        addSolTransferInstructions(tx, payer, associatedUserVault, scaledAmount);
      }
    }

    const hook = Hooks.deriveHookAddress(this.hooksConfig, this.pairAddress, this.hooksProgram.programId);

    const position = Positions.derivePositionAddress(positionMint, this.lbProgram.programId);
    const positionVault = Positions.derivePositionVault(positionMint, payer);

    const ix = await this.lbProgram.methods
      .increasePosition(new BN(amountTokenX.toString()), new BN(amountTokenY.toString()), liquidityDistribution)
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
      .instruction();

    await addOptimalComputeBudget(tx, this.connection, this.bufferGas);
    tx.add(ix);

    return tx;
  }

  /**
   * Remove liquidity from one or more positions in this pair
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const { positionMints, payer, type } = params;

    const setupTransaction = new Transaction();

    const tokenVaultX = this.tokenVaultX;
    const tokenVaultY = this.tokenVaultY;

    const { userVaultX, userVaultY } = await getUserVaults(
      this.pairAccount.tokenMintX,
      this.pairAccount.tokenMintY,
      payer,
      this.connection,
      setupTransaction
    );
    const hook = Hooks.deriveHookAddress(this.hooksConfig, this.pairAddress, this.hooksProgram.programId);

    await Hooks.ensureHookTokenAccount(
      hook,
      this.pairAccount.tokenMintY,
      this.tokenProgramY!,
      payer,
      this.connection,
      setupTransaction
    );

    const closedPositions: PublicKey[] = [];
    const transactions = await Promise.all(
      positionMints.map(async (positionMint) => {
        const { tokenMintX, tokenMintY } = this.pairAccount;
        const position = Positions.derivePositionAddress(positionMint, this.lbProgram.programId);
        const positionAccount = await this.getPositionAccount(position);
        const binArrayIndex = BinArrays.calculateBinArrayIndex(positionAccount.lowerBinId);
        const { index } = await this.getBinArrayReserves({ binArrayIndex, payer });

        const { binArrayLower, binArrayUpper, hookBinArrayLower, hookBinArrayUpper } = BinArrays.getBinArraysForRemoval(
          index,
          this.pairAddress,
          hook,
          this.lbProgram.programId,
          this.hooksProgram.programId
        );

        const tx = new Transaction();
        await addOptimalComputeBudget(tx, this.connection, this.bufferGas);

        const positionVault = Positions.derivePositionVault(positionMint, payer);

        const reserveXY = await this.getPositionReserves({ position, payer });
        const hookPosition = Hooks.getHookPosition(hook, position, this.hooksProgram);

        const removedShares = Liquidity.calculateRemovedShares(
          reserveXY,
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId
        );
        const availableShares = Liquidity.getAvailableShares(reserveXY, type);
        const isClosePosition = Liquidity.shouldClosePosition(
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId,
          availableShares
        );

        if (isClosePosition) {
          const ix = await this.lbProgram.methods
            .closePosition()
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower,
              binArrayUpper,
              tokenVaultX,
              tokenVaultY,
              userVaultX,
              userVaultY,
              positionTokenAccount: positionVault,
              tokenMintX,
              tokenMintY,
              tokenProgramX: this.tokenProgramX,
              tokenProgramY: this.tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          closedPositions.push(position);
          tx.add(ix);
        } else {
          const ix = await this.lbProgram.methods
            .decreasePosition(removedShares)
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower,
              binArrayUpper,
              tokenVaultX: tokenVaultX,
              tokenVaultY: tokenVaultY,
              userVaultX,
              userVaultY,
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
              { pubkey: hookBinArrayLower, isWritable: true, isSigner: false },
              { pubkey: hookBinArrayUpper, isWritable: true, isSigner: false },
              { pubkey: hookPosition, isWritable: true, isSigner: false },
            ])
            .instruction();

          tx.add(ix);
        }

        return tx;
      })
    );

    const cleanupTransaction = new Transaction();
    handleSolWrapping(
      cleanupTransaction,
      this.pairAccount.tokenMintX,
      this.pairAccount.tokenMintY,
      userVaultX,
      userVaultY,
      payer,
      { isPreSwap: false }
    );

    return {
      transactions,
      setupTransaction: setupTransaction.instructions.length ? setupTransaction : undefined,
      cleanupTransaction: cleanupTransaction.instructions.length ? cleanupTransaction : undefined,
      closedPositions,
    };
  }

  /**
   * Get all user positions in this pair
   */
  public async getUserPositions(params: { payer: PublicKey }): Promise<PositionAccount[]> {
    return Positions.getUserPositions(params.payer, this.pairAddress, this.connection, this.lbProgram);
  }
}
