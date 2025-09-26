import { PRECISION_BIGINT, SCALE_OFFSET, MAX_BASIS_POINTS_BIGINT } from '../../constants';
import { SarosDLMMError } from '../errors';

/**
 * Calculates the input amount required for a swap based on the desired output amount and price.
 */
export const getAmountInByPrice = (
  amountOut: bigint,
  priceScaled: bigint,
  swapForY: boolean,
  rounding: 'up' | 'down'
): bigint => {
  if (swapForY) {
    // amountIn = (amountOut << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountOut << BigInt(SCALE_OFFSET)) + priceScaled - BigInt(1)) / priceScaled
      : (amountOut << BigInt(SCALE_OFFSET)) / priceScaled;
  } else {
    // amountIn = (amountOut * priceScaled) >> scaleOffset
    return rounding === 'up'
      ? (amountOut * priceScaled + (BigInt(1) << BigInt(SCALE_OFFSET)) - BigInt(1)) >>
          BigInt(SCALE_OFFSET)
      : (amountOut * priceScaled) >> BigInt(SCALE_OFFSET);
  }
};

/**
 * Calculates the output amount based on the input amount, price, and scaling factors.
 */
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
      ? (amountIn * priceScaled + (BigInt(1) << BigInt(SCALE_OFFSET)) - BigInt(1)) >>
          BigInt(SCALE_OFFSET)
      : (amountIn * priceScaled) >> BigInt(SCALE_OFFSET);
  } else {
    // price = (X / Y) & !swapForY => amountOut = amountIn / price
    // amountOut = (amountIn << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountIn << BigInt(SCALE_OFFSET)) + priceScaled - BigInt(1)) / priceScaled
      : (amountIn << BigInt(SCALE_OFFSET)) / priceScaled;
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

/**
 * Calculate maximum input amount with slippage protection for exact output swaps
 */
export const getMaxInputWithSlippage = (amountIn: bigint, slippage: number): bigint => {
  const slippageFraction = slippage / 100;
  const slippageScaled = Math.round(slippageFraction * Number(PRECISION_BIGINT));
  const denominatorScaled = Number(PRECISION_BIGINT) - slippageScaled;

  if (denominatorScaled <= 0) {
    throw SarosDLMMError.InvalidSlippage;
  }
  return (amountIn * PRECISION_BIGINT) / BigInt(denominatorScaled);
};

/**
 * Calculate price impact for swaps
 */
export const getPriceImpact = (amountOut: bigint, maxAmountOut: bigint): number => {
  if (maxAmountOut === 0n) return 0;

  // Using scaled integer math for precision with basis points
  const impactBasisPoints =
    ((amountOut - maxAmountOut) * MAX_BASIS_POINTS_BIGINT * 100n) / maxAmountOut;

  return Number(impactBasisPoints) / Number(MAX_BASIS_POINTS_BIGINT); // Convert back to percentage
};
