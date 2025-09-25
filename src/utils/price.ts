import { ACTIVE_ID, MAX_BASIS_POINTS } from '../constants';
import { PairServiceError } from '../services/pair/errors';

export const getPriceFromId = (
  binStep: number,
  binId: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS) {
    throw PairServiceError.InvalidBinStep;
  }

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = binId - ACTIVE_ID;
  const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal);

  return Math.pow(base, exponent) * decimalPow;
};

export const getIdFromPrice = (
  price: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (price <= 0) {
    throw PairServiceError.InvalidPrice;
  }
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS) {
    throw PairServiceError.InvalidBinStep;
  }

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + ACTIVE_ID);

  return binId;
};
