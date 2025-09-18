import { DLMMPairAccount } from '../../types';
import { VARIABLE_FEE_PRECISION, PRECISION_BIGINT, MAX_BASIS_POINTS_BIGINT } from '../../constants';

export class FeeCalculator {
  private static getVariableFee(pairInfo: DLMMPairAccount, volatilityAccumulator: number): bigint {
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

  private static getBaseFee(binStep: number, baseFactor: number): bigint {
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
}
