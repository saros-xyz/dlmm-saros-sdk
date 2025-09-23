import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { SarosBaseService, SarosConfig } from '../base';
import { FeeCalculator } from './fees';
import { VolatilityManager } from './volatility';
import { BinArrayRange } from './bin-range';
import * as spl from '@solana/spl-token';
import { BIN_ARRAY_SIZE, MAX_BIN_CROSSINGS, SCALE_OFFSET, WRAP_SOL_PUBKEY } from '../../constants';
import {
  DLMMPairAccount,
  QuoteParams,
  QuoteResponse,
  SwapParams,
  BinArray,
  PoolMetadata,
} from '../../types';
import { getPriceFromId } from '../../utils/price';
import {
  getAmountInByPrice,
  getAmountOutByPrice,
  getPriceImpact,
  getMinOutputWithSlippage,
  getMaxInputWithSlippage,
} from './calculations';
import { PoolServiceError } from '../pools/errors';
import { SwapServiceError } from './errors';
import { BinArrayManager } from '../pools/bin-manager';
import { addSolTransferInstructions, addCloseAccountInstruction } from '../../utils/transaction';
import { getTokenProgram, getUserVaultInfo } from '../../utils/vaults';

export class SwapService extends SarosBaseService {
  private volatilityManager: VolatilityManager;

  constructor(config: SarosConfig) {
    super(config);
    this.volatilityManager = new VolatilityManager();
  }

  private async calculateInOutAmount(params: QuoteParams) {
    const {
      amount,
      pair,
      options: { swapForY, isExactInput },
    } = params;
    try {
      //@ts-ignore
      const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
      if (!pairInfo) throw PoolServiceError.PoolNotFound;

      const currentBinArrayIndex = BinArrayManager.calculateBinArrayIndex(pairInfo.activeId);
      const binArrayIndexes = [
        currentBinArrayIndex - 1,
        currentBinArrayIndex,
        currentBinArrayIndex + 1,
      ];
      const binArrayAddresses = binArrayIndexes.map((idx) =>
        BinArrayManager.getBinArrayAddress(idx, pair, this.lbProgram.programId)
      );

      // Fetch bin arrays in batch, fallback to empty if not found
      // TODO: return errror instead of empty bin array if not found
      const binArrays: BinArray[] = await Promise.all(
        binArrayAddresses.map((address, i) =>
          //@ts-ignore
          this.lbProgram.account.binArray.fetch(address).catch(() => {
            return { index: binArrayIndexes[i], bins: [] } as BinArray;
          })
        )
      );

      // Validate bin arrays and build range
      const binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
      const totalSupply = binRange
        .getAllBins()
        .reduce((acc, cur) => acc.add(new BN(cur.totalSupply.toString())), new BN(0));
      if (totalSupply.isZero()) {
        // no liquidity
        // TODO: throw error instead?
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
          pairInfo,
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
          pairInfo,
          swapForY
        );

        return {
          amountIn,
          amountOut: amountAfterTransferFee,
        };
      }
    } catch (error) {
      throw new Error(error as string);
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
      // let totalProtocolFee = BigInt(0);
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

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          // protocolFeeAmount,
        } = this.swapExactOutput({
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
        // totalProtocolFee += protocolFeeAmount;

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
      // let totalProtocolFee = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatilityManager.updateReferences(
        pairInfo,
        activeId,
        // can we pass the values directly instead of functions?
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

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          // protocolFeeAmount,
        } = this.swapExactInput({
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
        // totalProtocolFee += protocolFeeAmount;

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
  private async getMaxAmountOutWithFee(
    pairAddress: PublicKey,
    amount: bigint,
    swapForY: boolean = false,
    decimalBase: number = 9,
    decimalQuote: number = 9
  ): Promise<{ maxAmountOut: bigint; price: number }> {
    try {
      let amountIn = amount;
      //@ts-ignore
      const pair: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pairAddress);
      if (!pair) throw new PoolServiceError('Pair not found');

      const { activeId, binStep } = pair;

      const feePrice = FeeCalculator.getTotalFee(
        pair,
        this.volatilityManager.getVolatilityAccumulator()
      );
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(binStep, activeId, decimalBase, decimalQuote);

      const feeAmount = FeeCalculator.getFeeAmount(amountIn, feePrice);
      amountIn = amountIn - feeAmount;
      const maxAmountOut = swapForY
        ? (amountIn * BigInt(activePrice)) >> BigInt(SCALE_OFFSET)
        : (amountIn << BigInt(SCALE_OFFSET)) / BigInt(activePrice);

      return { maxAmountOut, price };
    } catch {
      return { maxAmountOut: 0n, price: 0 };
    }
  }

  // only swap and getQuote are public
  public async swap(params: SwapParams): Promise<Transaction> {
    const {
      tokenIn: tokenMintX,
      tokenOut: tokenMintY,
      amount,
      minTokenOut: otherAmountOffset,
      options: { swapForY, isExactInput },

      pair,
      hook,
      payer,
    } = params;

    //@ts-ignore
    const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
    if (!pairInfo) throw PoolServiceError.PoolNotFound;

    const currentBinArrayIndex = BinArrayManager.calculateBinArrayIndex(pairInfo.activeId);

    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(async (idx) =>
        BinArrayManager.getBinArrayAddress(idx, pair, this.lbProgram.programId)
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
      const activeOffset = pairInfo.activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] =
        activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      binArrayLowerIndex,
      pair,
      this.lbProgram.programId
    );

    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      binArrayUpperIndex,
      pair,
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
      pair,
      true,
      tokenProgramX
    );

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      pair,
      true,
      tokenProgramY
    );

    // Use the centralized getUserVaultInfo function to create user vault accounts if needed
    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: tokenMintX, payer, transaction: tx },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: tokenMintY, payer, transaction: tx },
      this.connection
    );

    // Handle wrapped SOL transfers
    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if ((isNativeY && !swapForY) || (!isNativeY && swapForY)) {
        const solTokenProgram = isNativeY ? tokenProgramY : tokenProgramX;
        addSolTransferInstructions(tx, payer, associatedUserVault, amount, solTokenProgram);
      }
    }

    // Add swap instruction
    const swapInstructions = await this.lbProgram.methods
      .swap(
        new BN(amount.toString()),
        new BN(otherAmountOffset.toString()),
        swapForY,
        isExactInput ? { exactInput: {} } : { exactOutput: {} }
      )
      .accountsPartial({
        pair: pair,
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
        { pubkey: pair, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    // Handle wrapped SOL account closing
    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        const solTokenProgram = isNativeY ? tokenProgramY : tokenProgramX;
        addCloseAccountInstruction(tx, associatedUserVault, payer, solTokenProgram);
      }
    }

    return tx;
  }

  public async getQuote(params: QuoteParams, poolMetadata: PoolMetadata): Promise<QuoteResponse> {
    try {
      const { baseToken, quoteToken } = poolMetadata;
      const {
        slippage,
        pair,
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

      const { maxAmountOut } = await this.getMaxAmountOutWithFee(
        pair,
        amountIn,
        swapForY,
        baseToken.decimals,
        quoteToken.decimals
      );

      const priceImpact = getPriceImpact(amountOut, maxAmountOut);

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: isExactInput ? maxAmountIn : minAmountOut,
        minTokenOut: isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: priceImpact,
      };
    } catch (error) {
      throw error;
    }
  }
}
