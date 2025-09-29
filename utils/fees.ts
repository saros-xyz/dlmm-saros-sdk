import { BASIS_POINT_MAX, PRECISION, VARIABLE_FEE_PRECISION } from '../constants';
import { Pair } from '../types/services';

/**
 * Calculate the base fee for a given bin step and base factor.
 */
export const getBaseFee = (binStep: number, baseFactor: number): bigint => {
  return BigInt(binStep) * BigInt(baseFactor) * BigInt(10);
};

/**
 * Calculate the variable fee based on volatility and pair parameters.
 */
export const getVariableFee = (pairInfo: Pair, volatilityAccumulator: number): bigint => {
  const variableFeeControl = BigInt(pairInfo.staticFeeParameters.variableFeeControl);
  if (variableFeeControl > BigInt(0)) {
    const prod = BigInt(Math.floor(volatilityAccumulator * pairInfo.binStep));
    const variableFee =
      (prod * prod * variableFeeControl + BigInt(VARIABLE_FEE_PRECISION) - BigInt(1)) /
      BigInt(VARIABLE_FEE_PRECISION);
    return variableFee;
  }
  return variableFeeControl;
};

/**
 * Get the total fee = base fee + variable fee.
 */
export const getTotalFee = (pairInfo: Pair, volatilityAccumulator: number): bigint => {
  return getBaseFee(pairInfo.binStep, pairInfo.staticFeeParameters.baseFactor) +
    getVariableFee(pairInfo, volatilityAccumulator);
};

/**
 * Calculate fee amount when a fixed amount is given.
 */
export const getFeeAmount = (amount: bigint, fee: bigint): bigint => {
  return (amount * fee + BigInt(PRECISION) - BigInt(1)) / BigInt(PRECISION);
};

/**
 * Calculate fee to be added onto an input amount.
 */
export const getFeeForAmount = (amount: bigint, fee: bigint): bigint => {
  const denominator = BigInt(PRECISION) - fee;
  return (amount * fee + denominator - BigInt(1)) / denominator;
};

/**
 * Calculate protocol fee as a share of fees.
 */
export const getProtocolFee = (fee: bigint, protocolShare: bigint): bigint => {
  return (fee * protocolShare) / BigInt(BASIS_POINT_MAX);
};


/**
 * Calculate fee for a given pair account. Returns fees as percentages for pair metadata.
 */
/**
 * Calculate fee for a given pair account. Returns fees as percentages for pair metadata.
 */
export function getFeeMetadata(pairAccount: Pair) {
  const { binStep, staticFeeParameters, dynamicFeeParameters } = pairAccount;
  const { baseFactor, protocolShare } = staticFeeParameters;
  const { volatilityAccumulator } = dynamicFeeParameters;

  // Base fee raw
  const baseFeeRaw = getBaseFee(binStep, baseFactor);

  // Variable fee raw
  const variableFeeRaw = getVariableFee(pairAccount, volatilityAccumulator);

  // Dynamic fee raw = max(baseFee, variableFee)
  const dynamicFeeRaw = baseFeeRaw > variableFeeRaw ? baseFeeRaw : variableFeeRaw;

  // Protocol fee raw
  const protocolFeeRaw = getProtocolFee(dynamicFeeRaw, BigInt(protocolShare));

  // Convert to percentages (raw)
  const baseFee = (Number(baseFeeRaw) / Number(PRECISION)) * 100;
  const dynamicFee = (Number(dynamicFeeRaw) / Number(PRECISION)) * 100;
  const protocolFee = (Number(protocolFeeRaw) / Number(PRECISION)) * 100;

  return {
    baseFee,
    dynamicFee,
    protocolFee,
  };
}
