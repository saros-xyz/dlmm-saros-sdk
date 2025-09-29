import { BASIS_POINT_MAX, CENTER_BIN_ID } from '../constants';
import { DLMMError } from '../error';

/**
 * Get the price for a given bin id.
 */
export const getPriceFromId = (
  binStep: number,
  binId: number,
  decimalTokenX: number,
  decimalTokenY: number
): number => {
  const base = 1 + binStep / BASIS_POINT_MAX;
  const exponent = binId - CENTER_BIN_ID;
  const decimalPow = Math.pow(10, decimalTokenX - decimalTokenY);

  return Math.pow(base, exponent) * decimalPow;
};

/**
 * Get the bin id for a given price.
 */
export const getIdFromPrice = (
  price: number,
  binStep: number,
  decimalTokenX: number,
  decimalTokenY: number
): number => {
  if (price <= 0) {
    throw new DLMMError(`Price must be greater than 0, got: ${price}`, 'INVALID_PRICE');
  }
  if (binStep <= 0 || binStep > BASIS_POINT_MAX) {
    throw new DLMMError(`Invalid bin step: ${binStep}. Must be > 0 and <= ${BASIS_POINT_MAX}`, 'INVALID_BIN_STEP');
  }

  const decimalPow = Math.pow(10, decimalTokenY - decimalTokenX);
  const base = 1 + binStep / BASIS_POINT_MAX;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + CENTER_BIN_ID);

  return binId;
};

/**
 * Calculates the input amount required for a swap based on the desired output amount and price.
 *
 * @param amountOut - The desired output amount as a bigint.
 * @param priceScaled - The scaled price as a bigint.
 * @param scaleOffset - The scaling factor used for price adjustments.
 * @param swapForY - A boolean indicating the direction of the swap
 * @param rounding - Specifies the rounding mode
 */
export const calcAmountInByPrice = (
  amountOut: bigint,
  priceScaled: bigint,
  scaleOffset: number,
  swapForY: boolean,
  rounding: 'up' | 'down'
): bigint => {
  if (swapForY) {
    // amountIn = (amountOut << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountOut << BigInt(scaleOffset)) + priceScaled - BigInt(1)) / priceScaled
      : (amountOut << BigInt(scaleOffset)) / priceScaled;
  } else {
    // amountIn = (amountOut * priceScaled) >> scaleOffset
    return rounding === 'up'
      ? (amountOut * priceScaled + (BigInt(1) << BigInt(scaleOffset)) - BigInt(1)) >> BigInt(scaleOffset)
      : (amountOut * priceScaled) >> BigInt(scaleOffset);
  }
};

/**
 * Calculates the output amount based on the input amount, price, and scaling factors.
 *
 * @param amountIn - The input amount as a bigint.
 * @param priceScaled - The scaled price as a bigint.
 * @param scaleOffset - The scaling offset as a number, used to adjust the precision.
 * @param swapForY - A boolean indicating the direction of the swap
 * @param rounding - The rounding mode to apply when calculating the output amount
 */
export const calcAmountOutByPrice = (
  amountIn: bigint,
  priceScaled: bigint,
  scaleOffset: number,
  swapForY: boolean,
  rounding: 'up' | 'down'
): bigint => {
  if (swapForY) {
    // amountOut = (amountIn * priceScaled) >> scaleOffset
    return rounding === 'up'
      ? (amountIn * priceScaled + (BigInt(1) << BigInt(scaleOffset)) - BigInt(1)) >> BigInt(scaleOffset)
      : (amountIn * priceScaled) >> BigInt(scaleOffset);
  } else {
    // amountOut = (amountIn << scaleOffset) / priceScaled
    return rounding === 'up'
      ? ((amountIn << BigInt(scaleOffset)) + priceScaled - BigInt(1)) / priceScaled
      : (amountIn << BigInt(scaleOffset)) / priceScaled;
  }
};
