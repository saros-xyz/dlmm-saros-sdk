import { BASIS_POINT_MAX, ACTIVE_ID } from '../constants';
import { DLMMError } from '../error';

export const getPriceFromId = (
  bin_step: number,
  bin_id: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
) => {
  const base = 1 + bin_step / BASIS_POINT_MAX;
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
  if (price <= 0) throw new DLMMError(`Price must be greater than 0, got: ${price}`, 'INVALID_PRICE');
  if (binStep <= 0 || binStep > BASIS_POINT_MAX) throw new DLMMError(`Invalid bin step: ${binStep}. Must be > 0 and <= ${BASIS_POINT_MAX}`, 'INVALID_BIN_STEP');

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);

  const base = 1 + binStep / BASIS_POINT_MAX;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + ACTIVE_ID);

  return binId;
};
