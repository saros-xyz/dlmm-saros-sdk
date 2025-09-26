import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { chunk } from 'lodash';
import { SarosBaseService, SarosConfig } from './base';
import { BinArrayManager } from '../utils/pair/bin-manager';
import { LiquidityManager } from '../utils/position/liquidity';
import { FeeCalculator } from '../utils/swap/fees';
import { VolatilityManager } from '../utils/swap/volatility';
import { BinArrayRange } from '../utils/swap/bin-range';
import {
  BIN_ARRAY_SIZE,
  MAX_BIN_CROSSINGS,
  SCALE_OFFSET,
  WRAP_SOL_PUBKEY,
  MAX_BASIS_POINTS_BIGINT,
} from '../constants';
import {
  DLMMPairAccount,
  PairMetadata,
  PairLiquidityData,
  BinLiquidityData,
  Bin,
  QuoteResponse,
  BinArray,
  RemoveLiquidityResponse,
  PositionAccount,
  PositionBinBalance,
  GetMaxAmountOutWithFeeResponse,
  QuoteParams,
  SwapParams,
  GetMaxAmountOutWithFeeParams,
  GetBinArrayInfoParams,
  GetPositionBinBalancesParams,
  CreatePositionParams,
  AddLiquidityByShapeParams,
  RemoveLiquidityParams,
  GetPairLiquidityParams,
} from '../types';
import { getPriceFromId } from '../utils/price';
import { getPairVaultInfo, getUserVaultInfo, getTokenProgram } from '../utils/vaults';
import { SarosDLMMError } from '../utils/errors';
import {
  getAmountInByPrice,
  getAmountOutByPrice,
  getPriceImpact,
  getMinOutputWithSlippage,
  getMaxInputWithSlippage,
} from '../utils/swap/calculations';
import {
  addSolTransferInstructions,
  addCloseAccountInstruction,
  addOptimalComputeBudget,
} from '../utils/transaction';
import { createUniformDistribution, Distribution } from '../utils/position/bin-distribution';

export class SarosDLMMPair extends SarosBaseService {
  private pairAddress: PublicKey;
  private pairAccount!: DLMMPairAccount;
  private metadata!: PairMetadata;
  private volatilityManager: VolatilityManager;
  bufferGas?: number;

  constructor(config: SarosConfig, pairAddress: PublicKey) {
    super(config);
    this.pairAddress = pairAddress;
    this.volatilityManager = new VolatilityManager();
  }

  /**
   * Refresh the pair data from on-chain
   */
  public async refetchStates(): Promise<void> {
    await this.loadPairData();
  }

  /**
   * Load pair account and metadata from on-chain
   */
  private async loadPairData(): Promise<void> {
    try {
      //@ts-ignore
      this.pairAccount = await this.lbProgram.account.pair.fetch(this.pairAddress);
      if (!this.pairAccount) throw SarosDLMMError.PairFetchFailed;

      this.metadata = await this.buildPairMetadata();
    } catch (error) {
      if (error instanceof SarosDLMMError) throw error;
      throw SarosDLMMError.PairFetchFailed;
  }

  /**
   * Build pair metadata from pair account data
   */
  private async buildPairMetadata(): Promise<PairMetadata> {
    const [baseVault, quoteVault] = await Promise.all([
      getPairVaultInfo(
        { tokenMint: this.pairAccount.tokenMintX, pair: this.pairAddress },
        this.connection
      ),
      getPairVaultInfo(
        { tokenMint: this.pairAccount.tokenMintY, pair: this.pairAddress },
        this.connection
      ),
    ]);

    const [baseReserve, quoteReserve, baseMintInfo, quoteMintInfo] = await Promise.all([
      this.connection
        .getTokenAccountBalance(baseVault)
        .catch(() => ({ value: { amount: '0', decimals: 0 } })),
      this.connection
        .getTokenAccountBalance(quoteVault)
        .catch(() => ({ value: { amount: '0', decimals: 0 } })),
      this.connection.getParsedAccountInfo(this.pairAccount.tokenMintX),
      this.connection.getParsedAccountInfo(this.pairAccount.tokenMintY),
    ]);

    const baseDecimals =
      baseMintInfo.value?.data && 'parsed' in baseMintInfo.value.data
        ? (baseMintInfo.value.data.parsed.info.decimals ?? 0)
        : 0;
    const quoteDecimals =
      quoteMintInfo.value?.data && 'parsed' in quoteMintInfo.value.data
        ? (quoteMintInfo.value.data.parsed.info.decimals ?? 0)
        : 0;

    return {
      pair: this.pairAddress.toString(),
      baseToken: {
        mintAddress: this.pairAccount.tokenMintX.toString(),
        decimals: baseDecimals,
        reserve: baseReserve.value.amount,
      },
      quoteToken: {
        mintAddress: this.pairAccount.tokenMintY.toString(),
        decimals: quoteDecimals,
        reserve: quoteReserve.value.amount,
      },
      tradeFee: (this.pairAccount.staticFeeParameters.baseFactor * this.pairAccount.binStep) / 1e6,
      extra: { hook: this.pairAccount.hook?.toString() },
    };
  }

  /**
   * Get pair metadata (cached from initialization)
   */
  public getPairMetadata(): PairMetadata {
    return this.metadata;
  }

  /**
   * Get pair account data (cached from initialization)
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
   * Get all bins with liquidity for this pair
   */
  public async getPairLiquidity(params: GetPairLiquidityParams = {}): Promise<PairLiquidityData> {
    const { numberOfBinArrays: arrayRange = 1 } = params;

    try {
      const binArrayIndices = BinArrayManager.calculateBinArrayRange(
        this.pairAccount.activeId,
        arrayRange
      );
      const binArrayResults = await Promise.all(
        binArrayIndices.map(async (index) => {
          try {
            const addr = BinArrayManager.getBinArrayAddress(
              index,
              this.pairAddress,
              this.getDexProgramId()
            );
            //@ts-ignore
            const acc = await this.lbProgram.account.binArray.fetch(addr);
            return { index, bins: acc.bins };
          } catch {
            return { index, bins: [] };
          }
        })
      );

      const bins: BinLiquidityData[] = [];
      binArrayResults.forEach(({ index, bins: arr }) => {
        arr.forEach((bin: Bin, binIdx: number) => {
          if (bin.reserveX.gt(new BN(0)) || bin.reserveY.gt(new BN(0))) {
            const binId = index * BIN_ARRAY_SIZE + binIdx;
            const price = getPriceFromId(
              this.pairAccount.binStep,
              binId,
              this.metadata.baseToken.decimals,
              this.metadata.quoteToken.decimals
            );
            bins.push({
              binId,
              price,
              baseReserve: Number(bin.reserveX) / 10 ** this.metadata.baseToken.decimals,
              quoteReserve: Number(bin.reserveY) / 10 ** this.metadata.quoteToken.decimals,
            });
          }
        });
      });

      bins.sort((a, b) => a.binId - b.binId);

      return { activeBin: this.pairAccount.activeId, binStep: this.pairAccount.binStep, bins };
    } catch (error) {
      if (error instanceof PairServiceError) throw error;
      throw PairServiceError.Pair;
    }
  }

  /**
   * Get a quote for a swap on this pair
   */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    if (params.amount <= 0n) throw SwapServiceError.ZeroAmount;
    if (params.slippage < 0 || params.slippage >= 100) throw SwapServiceError.InvalidSlippage;

    try {
      const { baseToken, quoteToken } = this.metadata;
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
        decimalBase: baseToken.decimals,
        decimalQuote: quoteToken.decimals,
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
      if (error instanceof SwapServiceError) {
        throw error;
      }
      throw new Error(
        `Quote calculation failed: ${error instanceof Error ? error.message : error}`
      );
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

    // Use provided hook or default to instance hook config
    const hookConfig = hook || this.hooksConfig;

    if (amount <= 0n) throw SwapServiceError.ZeroAmount;
    if (otherAmountOffset < 0n) throw SwapServiceError.ZeroAmount;

    const currentBinArrayIndex = BinArrayManager.calculateBinArrayIndex(this.pairAccount.activeId);

    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(async (idx) =>
        BinArrayManager.getBinArrayAddress(idx, this.pairAddress, this.lbProgram.programId)
      )
    );

    const binArrayAccountsInfo = await this.connection.getMultipleAccountsInfo(binArrayAddresses);

    const validIndexes = surroundingIndexes.filter((_, i) => binArrayAccountsInfo[i]);

    if (validIndexes.length < 2) {
      throw SwapServiceError.NoValidBinArrays;
    }

    let binArrayLowerIndex: number;
    let binArrayUpperIndex: number;
    if (validIndexes.length === 2) {
      [binArrayLowerIndex, binArrayUpperIndex] = validIndexes;
    } else {
      const activeOffset = this.pairAccount.activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] =
        activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      binArrayLowerIndex,
      this.pairAddress,
      this.lbProgram.programId
    );

    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      binArrayUpperIndex,
      this.pairAddress,
      this.lbProgram.programId
    );

    const [tokenProgramX, tokenProgramY] = await Promise.all([
      getTokenProgram(tokenMintX, this.connection),
      getTokenProgram(tokenMintY, this.connection),
    ]);

    const latestBlockHash = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    const associatedPairVaultX = spl.getAssociatedTokenAddressSync(
      tokenMintX,
      this.pairAddress,
      true,
      tokenProgramX
    );

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      this.pairAddress,
      true,
      tokenProgramY
    );

    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: tokenMintX, payer, transaction: tx },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: tokenMintY, payer, transaction: tx },
      this.connection
    );

    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if ((isNativeY && !swapForY) || (!isNativeY && swapForY)) {
        addSolTransferInstructions(tx, payer, associatedUserVault, amount);
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

    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        addCloseAccountInstruction(tx, associatedUserVault, payer);
      }
    }

    return tx;
  }

  /**
   * Calculate maximum theoretical output for price impact analysis
   */
  public async getMaxAmountOutWithFee(
    params: GetMaxAmountOutWithFeeParams
  ): Promise<GetMaxAmountOutWithFeeResponse> {
    try {
      const { amount, swapForY = false, decimalBase = 9, decimalQuote = 9 } = params;
      if (amount <= 0n) throw SwapServiceError.ZeroAmount;

      const { activeId, binStep } = this.pairAccount;

      const feePrice = FeeCalculator.getTotalFee(
        this.pairAccount,
        this.volatilityManager.getVolatilityAccumulator()
      );
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(binStep, activeId, decimalBase, decimalQuote);

      const feeAmount = FeeCalculator.getFeeAmount(amount, feePrice);
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
      const currentBinArrayIndex = BinArrayManager.calculateBinArrayIndex(
        this.pairAccount.activeId
      );
      const binArrayIndexes = [
        currentBinArrayIndex - 1,
        currentBinArrayIndex,
        currentBinArrayIndex + 1,
      ];
      const binArrayAddresses = binArrayIndexes.map((idx) =>
        BinArrayManager.getBinArrayAddress(idx, this.pairAddress, this.lbProgram.programId)
      );

      const binArrays: BinArray[] = await Promise.all(
        binArrayAddresses.map((address, i) =>
          //@ts-ignore
          this.lbProgram.account.binArray.fetch(address).catch(() => {
            return { index: binArrayIndexes[i], bins: [] } as BinArray;
          })
        )
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
        const amountOut = await this.calculateAmountOut(
          amountAfterTransferFee,
          binRange,
          this.pairAccount,
          swapForY
        );

        return {
          amountIn: amount,
          amountOut,
        };
      } else {
        const amountIn = await this.calculateAmountIn(
          amountAfterTransferFee,
          binRange,
          this.pairAccount,
          swapForY
        );

        return {
          amountIn,
          amountOut: amountAfterTransferFee,
        };
      }
    } catch (error) {
      if (error instanceof SwapServiceError || error instanceof PairServiceError) {
        throw error;
      }
      throw new Error(
        `Quote calculation failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  private async calculateAmountIn(
    amount: bigint,
    bins: BinArrayRange,
    pairInfo: DLMMPairAccount,
    swapForY: boolean
  ) {
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

        const fee = FeeCalculator.getTotalFee(
          pairInfo,
          this.volatilityManager.getVolatilityAccumulator()
        );

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
        throw SwapServiceError.SwapExceedsMaxBinCrossings;
      }

      return amountIn;
    } catch (error) {
      throw error;
    }
  }

  private async calculateAmountOut(
    amount: bigint,
    bins: BinArrayRange,
    pairInfo: DLMMPairAccount,
    swapForY: boolean
  ) {
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

        const fee = FeeCalculator.getTotalFee(
          pairInfo,
          this.volatilityManager.getVolatilityAccumulator()
        );

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
        throw SwapServiceError.SwapExceedsMaxBinCrossings;
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
    const { binStep, activeId, amountOutLeft, protocolShare, swapForY, reserveX, reserveY, fee } =
      params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      throw SwapServiceError.BinHasNoReserves;
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());
    const amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    const amountInWithoutFee = getAmountInByPrice(amountOut, priceScaled, swapForY, 'up');

    const feeAmount = FeeCalculator.getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = FeeCalculator.getProtocolFee(feeAmount, protocolShareBigInt);

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
    const { binStep, activeId, amountInLeft, protocolShare, swapForY, reserveX, reserveY, fee } =
      params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      throw SwapServiceError.BinHasNoReserves;
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    let maxAmountIn = getAmountInByPrice(binReserveOutBigInt, priceScaled, swapForY, 'up');

    const maxFeeAmount = FeeCalculator.getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = FeeCalculator.getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = getAmountOutByPrice(amountIn, priceScaled, swapForY, 'down');
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount =
      protocolShare > BigInt(0)
        ? FeeCalculator.getProtocolFee(feeAmount, protocolShareBigInt)
        : BigInt(0);

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
  public async getBinArrayInfo(params: GetBinArrayInfoParams): Promise<BinArray> {
    const { binArrayIndex } = params;

    try {
      const current = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        this.pairAddress,
        this.lbProgram.programId
      );
      //@ts-ignore
      const { bins: currentBins } = await this.lbProgram.account.binArray.fetch(current);

      try {
        const next = BinArrayManager.getBinArrayAddress(
          binArrayIndex + 1,
          this.pairAddress,
          this.lbProgram.programId
        );
        //@ts-ignore
        const { bins: nextBins } = await this.lbProgram.account.binArray.fetch(next);
        return { bins: [...currentBins, ...nextBins], index: binArrayIndex };
      } catch {
        try {
          const prev = BinArrayManager.getBinArrayAddress(
            binArrayIndex - 1,
            this.pairAddress,
            this.lbProgram.programId
          );
          //@ts-ignore
          const { bins: prevBins } = await this.lbProgram.account.binArray.fetch(prev);
          return { bins: [...prevBins, ...currentBins], index: binArrayIndex - 1 };
        } catch {
          return { bins: currentBins, index: binArrayIndex };
        }
      }
    } catch (error) {
      throw new Error(`Failed to get bin array info for index ${binArrayIndex}: ${error}`);
    }
  }

  /**
   * Get detailed token balances for each bin in a position
   */
  public async getPositionBinBalances(
    params: GetPositionBinBalancesParams
  ): Promise<PositionBinBalance[]> {
    const { position, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = BinArrayManager.calculateBinArrayIndex(firstBinId);

    const { bins, index } = await this.getBinArrayInfo({ binArrayIndex, payer });

    const firstBinIndex = index * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    return binIds.map((binId: number, idx: number) => {
      const liquidityShare = positionInfo.liquidityShares[idx];
      const activeBin = bins[binId];

      if (activeBin) {
        const reserveX = activeBin.reserveX;
        const reserveY = activeBin.reserveY;
        const totalSupply = activeBin.totalSupply;

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

    await BinArrayManager.addInitializeBinArrayInstruction(
      BinArrayManager.calculateBinArrayIndex(lowerBinId),
      this.pairAddress,
      payer,
      transaction,
      this.connection,
      this.lbProgram
    );

    if (
      BinArrayManager.calculateBinArrayIndex(lowerBinId) !==
      BinArrayManager.calculateBinArrayIndex(upperBinId)
    ) {
      await BinArrayManager.addInitializeBinArrayInstruction(
        BinArrayManager.calculateBinArrayIndex(upperBinId),
        this.pairAddress,
        payer,
        transaction,
        this.connection,
        this.lbProgram
      );
    }

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );

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
    const {
      positionMint,
      payer,
      transaction: userTxn,
      baseAmount,
      quoteAmount,
      liquidityShape,
      binRange,
    } = params;

    if (baseAmount <= 0n && quoteAmount <= 0n) {
      throw PositionServiceError.CannotAddZero;
    }

    const transaction = userTxn || new Transaction();

    const tokenProgramX = await getTokenProgram(this.pairAccount.tokenMintX, this.connection);
    const tokenProgramY = await getTokenProgram(this.pairAccount.tokenMintY, this.connection);

    const associatedPairVaultX = await getPairVaultInfo(
      { tokenMint: this.pairAccount.tokenMintX, pair: this.pairAddress, payer, transaction },
      this.connection
    );
    const associatedPairVaultY = await getPairVaultInfo(
      { tokenMint: this.pairAccount.tokenMintY, pair: this.pairAddress, payer, transaction },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: this.pairAccount.tokenMintX, payer, transaction },
      this.connection
    );
    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: this.pairAccount.tokenMintY, payer, transaction },
      this.connection
    );

    const liquidityDistribution: Distribution[] = createUniformDistribution({
      shape: liquidityShape,
      binRange,
    });

    const lowerBinId = this.pairAccount.activeId + binRange[0];
    const upperBinId = this.pairAccount.activeId + binRange[1];

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      BinArrayManager.calculateBinArrayIndex(lowerBinId),
      this.pairAddress,
      this.lbProgram.programId
    );
    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      BinArrayManager.calculateBinArrayIndex(upperBinId),
      this.pairAddress,
      this.lbProgram.programId
    );

    if (
      this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      this.pairAccount.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const totalAmount = isNativeY ? quoteAmount : baseAmount;
      const totalLiquid = liquidityDistribution.reduce(
        (prev, curr) => prev + (isNativeY ? curr.distributionY : curr.distributionX),
        0
      );

      if (totalLiquid) {
        const amount = new BN(totalLiquid)
          .mul(new BN(totalAmount.toString()))
          .div(new BN(MAX_BASIS_POINTS_BIGINT.toString()));
        const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
        addSolTransferInstructions(transaction, payer, associatedUserVault, amount);
      }
    }

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('hook')),
        this.hooksConfig.toBuffer(),
        this.pairAddress.toBuffer(),
      ],
      this.hooksProgram.programId
    )[0];

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );

    const ix = await this.lbProgram.methods
      .increasePosition(
        new BN(baseAmount.toString()),
        new BN(quoteAmount.toString()),
        liquidityDistribution
      )
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
        tokenProgramX,
        tokenProgramY,
        positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        hook,
        hooksProgram: this.hooksProgram.programId,
        user: payer,
        positionMint,
      })
      .instruction();

    await addOptimalComputeBudget(transaction, this.connection, this.bufferGas);
    transaction.add(ix);

    return transaction;
  }

  /**
   * Remove liquidity from one or more positions in this pair
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const { positionMints, payer, type } = params;

    const tokenProgramX = await getTokenProgram(this.pairAccount.tokenMintX, this.connection);
    const tokenProgramY = await getTokenProgram(this.pairAccount.tokenMintY, this.connection);

    const setupTransaction = new Transaction();

    const associatedPairVaultX = await getPairVaultInfo(
      {
        tokenMint: this.pairAccount.tokenMintX,
        pair: this.pairAddress,
        payer,
        transaction: setupTransaction,
      },
      this.connection
    );
    const associatedPairVaultY = await getPairVaultInfo(
      {
        tokenMint: this.pairAccount.tokenMintY,
        pair: this.pairAddress,
        payer,
        transaction: setupTransaction,
      },
      this.connection
    );
    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: this.pairAccount.tokenMintX, payer, transaction: setupTransaction },
      this.connection
    );
    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: this.pairAccount.tokenMintY, payer, transaction: setupTransaction },
      this.connection
    );

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('hook')),
        this.hooksConfig.toBuffer(),
        this.pairAddress.toBuffer(),
      ],
      this.hooksProgram.programId
    )[0];

    const associatedHookTokenY = spl.getAssociatedTokenAddressSync(
      this.pairAccount.tokenMintY,
      hook,
      true,
      tokenProgramY
    );
    const infoHookTokenY = await this.connection.getAccountInfo(associatedHookTokenY);

    if (!infoHookTokenY) {
      setupTransaction.add(
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedHookTokenY,
          hook,
          this.pairAccount.tokenMintY,
          tokenProgramY
        )
      );
    }

    const closedPositions: string[] = [];
    const transactions = await Promise.all(
      positionMints.map(async (positionMint) => {
        const position = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
          this.lbProgram.programId
        )[0];

        const positionAccount = await this.getPositionAccount(position);

        const { index } = await this.getBinArrayInfo({
          binArrayIndex: BinArrayManager.calculateBinArrayIndex(positionAccount.lowerBinId),
          payer,
        });

        const binArrayLower = BinArrayManager.getBinArrayAddress(
          index,
          this.pairAddress,
          this.lbProgram.programId
        );
        const binArrayUpper = BinArrayManager.getBinArrayAddress(
          index + 1,
          this.pairAddress,
          this.lbProgram.programId
        );

        const tx = new Transaction();
        await addOptimalComputeBudget(tx, this.connection, this.bufferGas);

        const positionVault = spl.getAssociatedTokenAddressSync(
          positionMint,
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = await this.getPositionBinBalances({ position, payer });

        const hookBinArrayLower = BinArrayManager.getHookBinArrayAddress(
          hook,
          this.hooksProgram.programId,
          index
        );
        const hookBinArrayUpper = BinArrayManager.getHookBinArrayAddress(
          hook,
          this.hooksProgram.programId,
          index + 1
        );

        const hookPosition = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), position.toBuffer()],
          this.hooksProgram.programId
        )[0];

        const removedShares = LiquidityManager.calculateRemovedShares(
          reserveXY,
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId
        );
        const availableShares = LiquidityManager.getAvailableShares(reserveXY, type);
        const isClosePosition = LiquidityManager.shouldClosePosition(
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
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX: this.pairAccount.tokenMintX,
              tokenMintY: this.pairAccount.tokenMintY,
              tokenProgramX,
              tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          closedPositions.push(position.toString());
          tx.add(ix);
        } else {
          const ix = await this.lbProgram.methods
            .decreasePosition(removedShares)
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
              tokenProgramX,
              tokenProgramY,
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
    if (
      this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      this.pairAccount.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      addCloseAccountInstruction(cleanupTransaction, associatedUserVault, payer);
    }

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
    const { payer } = params;
    const [legacyAccountsResp, token2022AccountsResp] = await Promise.all([
      this.connection.getParsedTokenAccountsByOwner(payer, { programId: spl.TOKEN_PROGRAM_ID }),
      this.connection.getParsedTokenAccountsByOwner(payer, {
        programId: spl.TOKEN_2022_PROGRAM_ID,
      }),
    ]);

    const combined = [...legacyAccountsResp.value, ...token2022AccountsResp.value];

    if (combined.length === 0) {
      return [];
    }
    const mints = Array.from(
      combined
        .filter((acc) => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .reduce(
          (set: Set<string>, acc) => set.add(acc.account.data.parsed.info.mint),
          new Set<string>()
        )
    ).map((m) => new PublicKey(m));

    const positionPdas = mints.map(
      (mint) =>
        PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), mint.toBuffer()],
          this.lbProgram.programId
        )[0]
    );

    const positions = await this.getPositionAccounts(positionPdas);
    return positions.filter(Boolean).sort((a, b) => a.lowerBinId - b.lowerBinId);
  }

  private async getPositionAccounts(positionPdas: PublicKey[]): Promise<PositionAccount[]> {
    try {
      const chunks = chunk(positionPdas, 100);
      const all: PositionAccount[] = [];

      for (const c of chunks) {
        //@ts-ignore
        const positions = await this.lbProgram.account.position.fetchMultiple(c);
        all.push(
          ...positions
            .map((p: any, i: number) =>
              p && p.pair.toString() === this.pairAddress.toString()
                ? { ...p, position: c[i].toString() }
                : null
            )
            .filter(Boolean)
        );
      }

      return all;
    } catch {
      const positions = await Promise.all(
        positionPdas.map(async (pda) => {
          try {
            //@ts-ignore
            const p = await this.lbProgram.account.position.fetch(pda);
            if (p.pair.toString() !== this.pairAddress.toString()) return null;
            return { ...p, position: pda.toString() };
          } catch {
            return null;
          }
        })
      );

      return positions.filter(Boolean);
    }
  }
}
