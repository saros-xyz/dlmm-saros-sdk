import { BN, utils } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { LiquidityBookAbstract } from "../base/abstract";
import { FeeCalculator } from "./fees";
import { VolatilityManager } from "./volatility";
import { BinArrayRange } from "./bin-manager";
import { SwapExecutor } from "./execution";
import {
  BIN_ARRAY_SIZE,
  SCALE_OFFSET,
} from "../../constants";
import {
  DLMMPairAccount,
  GetTokenOutputParams,
  GetTokenOutputResponse,
  SwapParams,
  Bin,
  BinArray,
  ILiquidityBookConfig,
} from "../../types";
import { getPriceFromId } from "../../utils/price";
import {
  getAmountInByPrice,
  getAmountOutByPrice,
  getPriceImpact,
  getMinOutputWithSlippage,
  getMaxInputWithSlippage,
} from "./calculations";

// Classes moved to separate files:
// - LBError → ./errors.ts
// - BinArrayRange → ./bin-manager.ts
// - SwapExecutor → ./execution.ts

export class SwapService extends LiquidityBookAbstract {
  private volatilityManager: VolatilityManager;
  private swapExecutor: SwapExecutor;

  constructor(config: ILiquidityBookConfig) {
    super(config);
    this.volatilityManager = new VolatilityManager();
    this.swapExecutor = new SwapExecutor(
      this.lbProgram,
      this.hooksProgram,
      this.connection,
      this.getTokenProgram.bind(this)
    );
  }

  public async calculateInOutAmount(params: GetTokenOutputParams) {
    const { amount, swapForY, pair, isExactInput } = params;
    try {
      //@ts-ignore
      const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
      if (!pairInfo) throw new Error("Pair not found");

      const currentBinArrayIndex = Math.floor(
        pairInfo.activeId / BIN_ARRAY_SIZE
      );
      const binArrayIndexes = [
        currentBinArrayIndex - 1,
        currentBinArrayIndex,
        currentBinArrayIndex + 1,
      ];
      const binArrayAddresses = binArrayIndexes.map((idx) =>
        this.getBinArrayAddress({
          binArrayIndex: idx,
          pair,
        })
      );

      // Fetch bin arrays in batch, fallback to empty if not found
      const binArrays: BinArray[] = await Promise.all(
        binArrayAddresses.map((address, i) =>
          //@ts-ignore
          this.lbProgram.account.binArray.fetch(address).catch((error: any) => {
            return { index: binArrayIndexes[i], bins: [] } as BinArray;
          })
        )
      );

      // Validate bin arrays and build range
      const binRange = new BinArrayRange(
        binArrays[0],
        binArrays[1],
        binArrays[2]
      );
      const totalSupply = binRange
        .getAllBins()
        .reduce(
          (acc, cur) => acc.add(new BN(cur.totalSupply.toString())),
          new BN(0)
        );
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

  private getBinArrayAddress(params: { binArrayIndex: number; pair: PublicKey }): PublicKey {
    const { binArrayIndex, pair } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    return binArray;
  }

  private async calculateAmountIn(
    amount: bigint,
    bins: BinArrayRange,
    pairInfo: DLMMPairAccount,
    swapForY: boolean
  ) {
    try {
      let amountIn = BigInt(0);
      let totalProtocolFee = BigInt(0);
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

        const fee = FeeCalculator.getTotalFee(pairInfo, this.volatilityManager.getVolatilityAccumulator());

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          protocolFeeAmount,
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
        totalProtocolFee += protocolFeeAmount;

        if (!amountOutLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }

      if (totalBinUsed >= 30) {
        throw "Swap crosses too many bins – quote aborted.";
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
      let totalProtocolFee = BigInt(0);
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

        const fee = FeeCalculator.getTotalFee(pairInfo, this.volatilityManager.getVolatilityAccumulator());

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          protocolFeeAmount,
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
        totalProtocolFee += protocolFeeAmount;

        if (!amountInLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }
      if (totalBinUsed >= 30) {
        throw "Swap crosses too many bins – quote aborted.";
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
    const {
      binStep,
      activeId,
      amountOutLeft,
      protocolShare,
      swapForY,
      reserveX,
      reserveY,
      fee,
    } = params;
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
    const amountOut =
      amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    const price = getPriceFromId(binStep, activeId, 9, 9);
    const priceScaled = BigInt(
      Math.round(Number(price) * Math.pow(2, SCALE_OFFSET))
    );

    const amountInWithoutFee = getAmountInByPrice(
      amountOut,
      priceScaled,
      swapForY,
      "up"
    );

    const feeAmount = FeeCalculator.getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = FeeCalculator.getProtocolFee(
      feeAmount,
      protocolShareBigInt
    );

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
    const {
      binStep,
      activeId,
      amountInLeft,
      protocolShare,
      swapForY,
      reserveX,
      reserveY,
      fee,
    } = params;
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
    const priceScaled = BigInt(
      Math.round(Number(price) * Math.pow(2, SCALE_OFFSET))
    );

    let maxAmountIn = getAmountInByPrice(
      binReserveOutBigInt,
      priceScaled,
      swapForY,
      "up"
    );

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
      amountOut = getAmountOutByPrice(amountIn, priceScaled, swapForY, "down");
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

  public async getQuote(
    params: GetTokenOutputParams
  ): Promise<GetTokenOutputResponse> {
    try {
      const data = await this.calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;

      if (params.isExactInput) {
        minAmountOut = getMinOutputWithSlippage(amountOut, params.slippage);
      } else {
        maxAmountIn = getMaxInputWithSlippage(amountIn, params.slippage);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee(
        params.pair,
        amountIn,
        params.swapForY,
        params.tokenBaseDecimal,
        params.tokenQuoteDecimal
      );

      const priceImpact = getPriceImpact(amountOut, maxAmountOut);

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: params.isExactInput ? maxAmountIn : minAmountOut,
        otherAmountOffset: params.isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: priceImpact,
      };
    } catch (error) {
      throw error;
    }
  }

  public async getMaxAmountOutWithFee(
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

      if (!pair) throw new Error("Pair not found");

      const { activeId, binStep } = pair;

      const feePrice = FeeCalculator.getTotalFee(pair, this.volatilityManager.getVolatilityAccumulator());
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(
        binStep,
        activeId,
        decimalBase,
        decimalQuote
      );

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

  public async swap(params: SwapParams): Promise<Transaction> {
    return this.swapExecutor.executeSwap(params);
  }
}