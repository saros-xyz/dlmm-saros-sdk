import { DLMMPairAccount } from '../types';
import { VARIABLE_FEE_PRECISION, PRECISION_BIGINT, MAX_BASIS_POINTS_BIGINT, MAX_BASIS_POINTS } from '../constants';

export interface FeeCalculationResult {
  baseFee: number;
  variableFee: number;
  dynamicFee: number;
  protocolFee: number;
}

export class Fees {
  public static getVariableFee(pairInfo: DLMMPairAccount, volatilityAccumulator: number): bigint {
    const variableFeeControl = BigInt(pairInfo.staticFeeParameters.variableFeeControl);
    if (variableFeeControl > BigInt(0)) {
      const prod = BigInt(Math.floor(volatilityAccumulator * pairInfo.binStep));
      const variableFee =
        (prod * prod * variableFeeControl + BigInt(VARIABLE_FEE_PRECISION) - BigInt(1)) /
        BigInt(VARIABLE_FEE_PRECISION);
      return variableFee;
    }
    return variableFeeControl;
  }

  public static getBaseFee(binStep: number, baseFactor: number): bigint {
    return BigInt(binStep) * BigInt(baseFactor) * BigInt(10);
  }

  public static getFeeForAmount(amount: bigint, fee: bigint): bigint {
    const denominator = PRECISION_BIGINT - fee;
    const feeForAmount = (amount * fee + denominator - BigInt(1)) / denominator;
    return feeForAmount;
  }

  public static getFeeAmount(amount: bigint, fee: bigint): bigint {
    const feeAmount = (amount * fee + PRECISION_BIGINT - BigInt(1)) / PRECISION_BIGINT;
    return feeAmount;
  }

  public static getProtocolFee(fee: bigint, protocolShare: bigint): bigint {
    const protocolFee = (fee * protocolShare) / MAX_BASIS_POINTS_BIGINT;
    return protocolFee;
  }

  public static getTotalFee(pairInfo: DLMMPairAccount, volatilityAccumulator: number): bigint {
    return (
      this.getBaseFee(pairInfo.binStep, pairInfo.staticFeeParameters.baseFactor) +
      this.getVariableFee(pairInfo, volatilityAccumulator)
    );
  }

  /**
   * Calculate user-facing fee percentages for pair metadata
   * TODO: VERIFY calculations are correct and if dynamic values should be returned
   */
  public static calculateFeePercentages(
    binStep: number,
    staticFeeParameters: DLMMPairAccount['staticFeeParameters'],
    dynamicFeeParameters: DLMMPairAccount['dynamicFeeParameters']
  ): FeeCalculationResult {
    // Calculate base fee: binStep * baseFactor * 10 / PRECISION
    const baseFeeRaw = this.getBaseFee(binStep, staticFeeParameters.baseFactor);
    const baseFeeDecimal = Number(baseFeeRaw) / Number(PRECISION_BIGINT);

    // Calculate variable fee from volatility
    const variableFeeRaw = this.getVariableFee(
      { binStep, staticFeeParameters } as DLMMPairAccount,
      dynamicFeeParameters.volatilityAccumulator
    );
    const variableFeeDecimal = Number(variableFeeRaw) / Number(PRECISION_BIGINT);

    // Dynamic fee is sum of base + variable fees
    const dynamicFeeDecimal = baseFeeDecimal + variableFeeDecimal;

    // Protocol fee is always protocolShare% of dynamic fee (typically 20%)
    const protocolFeePercentage = (staticFeeParameters.protocolShare / MAX_BASIS_POINTS) * dynamicFeeDecimal;

    return {
      // Convert to percentages
      baseFee: baseFeeDecimal * 100,
      variableFee: variableFeeDecimal * 100,
      dynamicFee: dynamicFeeDecimal * 100,
      protocolFee: protocolFeePercentage * 100,
    };
  }
}
