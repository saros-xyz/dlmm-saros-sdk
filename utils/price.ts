import {
  ACTIVE_ID,
  MAX_BASIS_POINTS,
} from "../constants";

export const getPriceFromId = (
  bin_step: number,
  bin_id: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  // Use same base calculation as getIdFromPrice for consistency
  const base = 1 + bin_step / MAX_BASIS_POINTS;
  const exponent = bin_id - ACTIVE_ID;
  const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal);

  return Math.pow(base, exponent) * decimalPow;
};

export const getIdFromPrice = (
  price: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (price <= 0) throw new Error("Price must be greater than 0");
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS)
    throw new Error("Bin step invalid. (0 < binStep <= 10000)");

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + ACTIVE_ID);

  return binId;
};

// Functions moved to service-specific files:
// - getPriceImpact → services/swap/calculations.ts
// - getGasPrice → services/positions/gas.ts
// - getAmountInByPrice → services/swap/calculations.ts
// - getAmountOutByPrice → services/swap/calculations.ts
// - getMinOutputWithSlippage → services/swap/calculations.ts
// - getMaxInputWithSlippage → services/swap/calculations.ts
  