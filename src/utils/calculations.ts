import { PRECISION_BIGINT, SCALE_OFFSET_BIGINT, MAX_BASIS_POINTS_BIGINT } from '../constants';
import { SarosDLMMError } from './errors';

/** Calculates the input amount required for a swap based on the desired output amount and price. */
export const getAmountInByPrice = (
  amountOut: bigint,
  priceScaled: bigint,
  swapForY: boolean,
  rounding: 'up' | 'down'
): bigint => {
  if (swapForY) {
    // amountIn = (amountOut << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountOut << SCALE_OFFSET_BIGINT) + priceScaled - 1n) / priceScaled
      : (amountOut << SCALE_OFFSET_BIGINT) / priceScaled;
  } else {
    // amountIn = (amountOut * priceScaled) >> scaleOffset
    return rounding === 'up'
      ? (amountOut * priceScaled + (1n << SCALE_OFFSET_BIGINT) - 1n) >> SCALE_OFFSET_BIGINT
      : (amountOut * priceScaled) >> SCALE_OFFSET_BIGINT;
  }
};

/** Calculates the output amount based on the input amount, price, and scaling factors. */
export const getAmountOutByPrice = (
  amountIn: bigint,
  priceScaled: bigint,
  swapForY: boolean,
  rounding: 'up' | 'down'
): bigint => {
  if (swapForY) {
    // price = (Y / X) & swapForY => amountOut = amountIn * price
    // amountOut = (amountIn * priceScaled) >> scaleOffset
    return rounding === 'up'
      ? (amountIn * priceScaled + (1n << SCALE_OFFSET_BIGINT) - 1n) >> SCALE_OFFSET_BIGINT
      : (amountIn * priceScaled) >> SCALE_OFFSET_BIGINT;
  } else {
    // price = (X / Y) & !swapForY => amountOut = amountIn / price
    // amountOut = (amountIn << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountIn << SCALE_OFFSET_BIGINT) + priceScaled - 1n) / priceScaled
      : (amountIn << SCALE_OFFSET_BIGINT) / priceScaled;
  }
};

/**
 * Calculate minimum output amount with slippage protection for exact input swaps
 */
export const getMinOutputWithSlippage = (amountOut: bigint, slippage: number): bigint => {
  const slippageFraction = slippage / 100;
  const slippageScaled = Math.round(slippageFraction * Number(PRECISION_BIGINT));

  return (amountOut * (PRECISION_BIGINT - BigInt(slippageScaled))) / PRECISION_BIGINT;
};

/** Calculate maximum input amount with slippage protection for exact output swaps */
export const getMaxInputWithSlippage = (amountIn: bigint, slippage: number): bigint => {
  const slippageFraction = slippage / 100;
  const slippageScaled = Math.round(slippageFraction * Number(PRECISION_BIGINT));
  const denominatorScaled = Number(PRECISION_BIGINT) - slippageScaled;

  if (denominatorScaled <= 0) {
    throw SarosDLMMError.InvalidSlippage();
  }
  return (amountIn * PRECISION_BIGINT) / BigInt(denominatorScaled);
};

/** Calculate price impact for swaps */
export const getPriceImpact = (amountOut: bigint, maxAmountOut: bigint): number => {
  if (maxAmountOut === 0n) return 0;

  // Using scaled integer math for precision with basis points
  const impactBasisPoints = ((amountOut - maxAmountOut) * MAX_BASIS_POINTS_BIGINT * 100n) / maxAmountOut;

  return Number(impactBasisPoints) / Number(MAX_BASIS_POINTS_BIGINT); // Convert back to percentage
};
