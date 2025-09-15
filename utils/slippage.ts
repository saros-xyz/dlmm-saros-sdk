import { PRECISION_BIGINT } from "../constants/config";

/**
 * Calculate minimum output amount with slippage protection for exact input swaps
 * @param amountOut - Expected output amount
 * @param slippage - Slippage percentage (e.g., 10 for 10%)
 * @returns Minimum acceptable output amount
 */
export const getMinOutputWithSlippage = (
  amountOut: bigint,
  slippage: number
): bigint => {
  const slippageFraction = slippage / 100;
  const slippageScaled = Math.round(
    slippageFraction * Number(PRECISION_BIGINT)
  );

  return (
    (amountOut * (PRECISION_BIGINT - BigInt(slippageScaled))) / PRECISION_BIGINT
  );
};

/**
 * Calculate maximum input amount with slippage protection for exact output swaps
 * @param amountIn - Expected input amount
 * @param slippage - Slippage percentage (e.g., 10 for 10%)
 * @returns Maximum acceptable input amount
 */
export const getMaxInputWithSlippage = (
  amountIn: bigint,
  slippage: number
): bigint => {
  const slippageFraction = slippage / 100;
  const slippageScaled = Math.round(
    slippageFraction * Number(PRECISION_BIGINT)
  );
  const denominatorScaled = Number(PRECISION_BIGINT) - slippageScaled;

  if (denominatorScaled <= 0) {
    throw new Error(
      `Invalid slippage: ${slippage}% results in division by zero`
    );
  }

  return (amountIn * PRECISION_BIGINT) / BigInt(denominatorScaled);
};
