import { CENTER_BIN_ID, MAX_BASIS_POINTS } from '../constants';
import { SarosDLMMError } from './errors';

export const getPriceFromId = (
  binStep: number,
  binId: number,
  decimalTokenX: number,
  decimalTokenY: number
): number => {
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS) {
    throw SarosDLMMError.InvalidBinStep();
  }

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = binId - CENTER_BIN_ID;
  const decimalPow = Math.pow(10, decimalTokenX - decimalTokenY);

  return Math.pow(base, exponent) * decimalPow;
};

export const getIdFromPrice = (
  price: number,
  binStep: number,
  decimalTokenX: number,
  decimalTokenY: number
): number => {
  if (price <= 0) {
    throw SarosDLMMError.InvalidPrice();
  }
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS) {
    throw SarosDLMMError.InvalidBinStep();
  }

  const decimalPow = Math.pow(10, decimalTokenY - decimalTokenX);

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + CENTER_BIN_ID);

  return binId;
};
