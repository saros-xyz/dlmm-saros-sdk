import { BN, Idl, Program, utils } from "@coral-xyz/anchor";
import { Bin, BinArray } from "../types";

import { Connection, PublicKey } from "@solana/web3.js";
import {
  BASIS_POINT_MAX,
  BIN_ARRAY_SIZE,
  PRECISION,
  SCALE_OFFSET,
  VARIABLE_FEE_PRECISION,
} from "../constants/config";
import { getPriceFromId } from "../utils/price";
import {
  GetBinArrayParams,
  GetTokenOutputParams,
  Pair,
} from "../types/services";

class LBError extends Error {
  static BinNotFound = new LBError("Bin not found");
  static BinArrayIndexMismatch = new LBError("Bin array index mismatch");

  constructor(message: string) {
    super(message);
    this.name = "LBError";
  }
}

class BinArrayRange {
  private readonly bins: { [binId: number]: Bin };
  constructor(
    binArrayPrevious: BinArray,
    binArrayCurrent: BinArray,
    binArrayNext: BinArray
  ) {
    if (
      binArrayCurrent.index !== binArrayPrevious.index + 1 ||
      binArrayNext.index !== binArrayCurrent.index + 1
    ) {
      throw LBError.BinArrayIndexMismatch;
    }

    this.bins = {};

    const addBins = (binArray: BinArray) => {
      binArray.bins.forEach((bin, index) => {
        const binId = binArray.index * BIN_ARRAY_SIZE + index;
        this.bins[binId] = bin;
      });
    };

    addBins(binArrayPrevious);
    addBins(binArrayCurrent);
    addBins(binArrayNext);
  }

  getBinMut(binId: number) {
    const bin = this.bins[binId];
    return bin;
  }

  getAllBins() {
    return Object.values(this.bins);
  }
}

export class LBSwapService {
  lbProgram!: Program<Idl>;
  volatilityAccumulator: number;
  volatilityReference: number;
  timeLastUpdated: number;
  referenceId: number;
  connection: Connection;

  constructor(lbProgram: Program<Idl>, connection: Connection) {
    this.lbProgram = lbProgram;
    this.connection = connection;
    this.volatilityAccumulator = 0;
    this.volatilityReference = 0;
    this.referenceId = 0;
    this.timeLastUpdated = 0;
  }

  static fromLbConfig(lbProgram: Program<Idl>, connection: Connection) {
    return new LBSwapService(lbProgram, connection);
  }

  getBinArray(params: GetBinArrayParams) {
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

  public async calculateInOutAmount(params: GetTokenOutputParams) {
    const { amount, swapForY, pair, isExactInput } = params;
    try {
       //@ts-ignore
      const pairInfo: Pair = await this.lbProgram.account.pair.fetch(pair);
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
        this.getBinArray({
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
        .reduce((acc, cur) => acc.add(cur.totalSupply), new BN(0));
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

  /**
   * @description Calculate the input amount for the swap. isExactInput = false
   */
  public async calculateAmountIn(
    amount: bigint,
    bins: BinArrayRange,
    pairInfo: Pair,
    swapForY: boolean
  ) {
    try {
      let amountIn = BigInt(0);
      let totalProtocolFee = BigInt(0);
      let amountOutLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.updateReferences(pairInfo, activeId);

      while (amountOutLeft > BigInt(0)) {
        totalBinUsed++;
        this.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const fee = this.getTotalFee(pairInfo);

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
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
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

  /**
   * @description Calculate the output amount for the swap. isExactInput = true
   */
  public async calculateAmountOut(
    amount: bigint,
    bins: BinArrayRange,
    pairInfo: Pair,
    swapForY: boolean
  ) {
    try {
      let amountOut = BigInt(0);
      let totalProtocolFee = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.updateReferences(pairInfo, activeId);

      while (amountInLeft > BigInt(0)) {
        totalBinUsed++;
        this.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const fee = this.getTotalFee(pairInfo);

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
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
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

  public swapExactOutput(params: {
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

    /** @notice assume base token and quote token have the same decimals to get the price */
    const price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    const priceScaled = BigInt(
      Math.round(Number(price) * Math.pow(2, SCALE_OFFSET))
    );

    const amountInWithoutFee = this.calcAmountInByPrice(
      amountOut,
      priceScaled,
      SCALE_OFFSET,
      swapForY,
      "up"
    );

    const feeAmount = this.getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = this.getProtocolFee(
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

  public swapExactInput(params: {
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

    /** @notice assume base token and quote token have the same decimals to get the price */
    const price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    const priceScaled = BigInt(
      Math.round(Number(price) * Math.pow(2, SCALE_OFFSET))
    );

    // Calculate maxAmountIn (input needed to take all output in bin, before fee)
    let maxAmountIn = this.calcAmountInByPrice(
      binReserveOutBigInt,
      priceScaled,
      SCALE_OFFSET,
      swapForY,
      "up"
    );

    // Add fee to get total input needed (ceil)
    const maxFeeAmount = this.getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = this.getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = this.calcAmountOutByPrice(
        amountIn,
        priceScaled,
        SCALE_OFFSET,
        swapForY,
        "down"
      );
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount =
      protocolShare > BigInt(0)
        ? this.getProtocolFee(feeAmount, protocolShareBigInt)
        : BigInt(0);

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  public async updateReferences(pairInfo: Pair, activeId: number) {
    this.referenceId = pairInfo.dynamicFeeParameters.idReference;
    this.timeLastUpdated =
      pairInfo.dynamicFeeParameters.timeLastUpdated.toNumber();
    this.volatilityReference =
      pairInfo.dynamicFeeParameters.volatilityReference;

    const slot = await this.connection.getSlot(); // Lấy slot hiện tại
    const blockTimeStamp = await this.connection.getBlockTime(slot);

    if (blockTimeStamp) {
      const timeDelta = blockTimeStamp - this.timeLastUpdated;

      if (timeDelta > pairInfo.staticFeeParameters.filterPeriod) {
        this.referenceId = activeId;

        if (timeDelta >= pairInfo.staticFeeParameters.decayPeriod) {
          this.volatilityReference = 0;
        } else {
          return this.updateVolatilityReference(pairInfo);
        }
      }

      this.timeLastUpdated = blockTimeStamp;
    }

    return this.updateVolatilityAccumulator(pairInfo, activeId);
  }

  public updateVolatilityReference(pairInfo: Pair) {
    this.volatilityReference =
      (pairInfo.dynamicFeeParameters.volatilityAccumulator *
        pairInfo.staticFeeParameters.reductionFactor) /
      10_000;
  }

  public updateVolatilityAccumulator(pairInfo: Pair, activeId: number) {
    const deltaId = Math.abs(activeId - this.referenceId);
    const volatilityAccumulator = deltaId * 10000 + this.volatilityReference;

    const maxVolatilityAccumulator =
      pairInfo.staticFeeParameters.maxVolatilityAccumulator;

    if (volatilityAccumulator > maxVolatilityAccumulator) {
      this.volatilityAccumulator = maxVolatilityAccumulator;
    } else {
      this.volatilityAccumulator = volatilityAccumulator;
    }
  }

  public getVariableFee(pairInfo: Pair): bigint {
    const variableFeeControl = BigInt(
      pairInfo.staticFeeParameters.variableFeeControl
    );
    if (variableFeeControl > BigInt(0)) {
      const prod = BigInt(
        Math.floor(this.volatilityAccumulator * pairInfo.binStep)
      );
      const variableFee =
        (prod * prod * variableFeeControl +
          BigInt(VARIABLE_FEE_PRECISION) -
          BigInt(1)) /
        BigInt(VARIABLE_FEE_PRECISION);
      return variableFee;
    }
    return variableFeeControl;
  }

  public getBaseFee(binStep: number, baseFactor: number): bigint {
    return BigInt(binStep) * BigInt(baseFactor) * BigInt(10);
  }

  public getFeeForAmount(amount: bigint, fee: bigint) {
    const denominator = BigInt(PRECISION) - fee;
    const feeForAmount = (amount * fee + denominator - BigInt(1)) / denominator;

    return feeForAmount;
  }

  public getFeeAmount(amount: bigint, fee: bigint) {
    const feeAmount =
      (amount * fee + BigInt(PRECISION) - BigInt(1)) / BigInt(PRECISION);

    return feeAmount;
  }

  public getProtocolFee(fee: bigint, protocolShare: bigint) {
    const protocolFee = (fee * protocolShare) / BigInt(BASIS_POINT_MAX);

    return protocolFee;
  }

  public getTotalFee(pairInfo: Pair) {
    return (
      this.getBaseFee(
        pairInfo.binStep,
        pairInfo.staticFeeParameters.baseFactor
      ) + this.getVariableFee(pairInfo)
    );
  }

  public moveActiveId(pairId: number, swapForY: boolean) {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }

  /**
   * Calculates the input amount required for a swap based on the desired output amount and price.
   *
   * @param amountOut - The desired output amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling factor used for price adjustments.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - Specifies the rounding mode
   * @returns The calculated input amount as a bigint.
   */
  private calcAmountInByPrice(
    amountOut: bigint,
    priceScaled: bigint,
    scaleOffset: number,
    swapForY: boolean,
    rounding: "up" | "down"
  ): bigint {
    if (swapForY) {
      // amountIn = (amountOut << scaleOffset) / priceScaled
      return rounding === "up"
        ? ((amountOut << BigInt(scaleOffset)) + priceScaled - BigInt(1)) /
            priceScaled
        : (amountOut << BigInt(scaleOffset)) / priceScaled;
    } else {
      // amountIn = (amountOut * priceScaled) >> scaleOffset
      return rounding === "up"
        ? (amountOut * priceScaled +
            (BigInt(1) << BigInt(scaleOffset)) -
            BigInt(1)) >>
            BigInt(scaleOffset)
        : (amountOut * priceScaled) >> BigInt(scaleOffset);
    }
  }

  /**
   * Calculates the output amount based on the input amount, price, and scaling factors.
   *
   * @param amountIn - The input amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling offset as a number, used to adjust the precision.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - The rounding mode to apply when calculating the output amount
   * @returns The calculated output amount as a bigint.
   */
  private calcAmountOutByPrice(
    amountIn: bigint,
    priceScaled: bigint,
    scaleOffset: number,
    swapForY: boolean,
    rounding: "up" | "down"
  ): bigint {
    if (swapForY) {
      // price = (Y / X) & swapForY => amountOut = amountIn * price
      // amountOut = (amountIn * priceScaled) >> scaleOffset
      return rounding === "up"
        ? (amountIn * priceScaled +
            (BigInt(1) << BigInt(scaleOffset)) -
            BigInt(1)) >>
            BigInt(scaleOffset)
        : (amountIn * priceScaled) >> BigInt(scaleOffset);
    } else {
      // price = (X / Y) & !swapForY => amountOut = amountIn / price
      // amountOut = (amountIn << scaleOffset) / priceScaled
      return rounding === "up"
        ? ((amountIn << BigInt(scaleOffset)) + priceScaled - BigInt(1)) /
            priceScaled
        : (amountIn << BigInt(scaleOffset)) / priceScaled;
    }
  }
}
