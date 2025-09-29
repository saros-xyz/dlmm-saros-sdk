import { BN } from '@coral-xyz/anchor';
import { DLMMError } from '../error';

// Number-based math functions for simple calculations
export const divRem = (numerator: number, denominator: number): [number, number] => {
  if (denominator === 0) {
    throw new DLMMError('Division by zero in math operation', 'DIVISION_BY_ZERO');
  }

  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;

  return [quotient, remainder];
};

export const mulDiv = (x: number, y: number, denominator: number, rounding: 'up' | 'down'): number => {
  if (denominator === 0) {
    throw new DLMMError('Division by zero in math operation', 'DIVISION_BY_ZERO');
  }

  const prod = x * y;

  if (rounding === 'up') {
    return Math.ceil(prod / denominator);
  }

  if (rounding === 'down') {
    return Math.floor(prod / denominator);
  }

  throw new DLMMError(`Invalid rounding mode: ${rounding}. Must be 'up' or 'down'`, 'INVALID_ROUNDING_MODE');
};

export const mulShr = (x: number, y: number, offset: number, rounding: 'up' | 'down'): number => {
  const denominator = 1 << offset;
  return mulDiv(x, y, denominator, rounding);
};

export const shlDiv = (x: number, y: number, offset: number, rounding: 'up' | 'down'): number => {
  const scale = 1 << offset;
  return mulDiv(x, scale, y, rounding);
};

// BN-based math functions for precision-critical calculations
export const mulDivBN = (x: BN, y: BN, denominator: BN, rounding: 'up' | 'down'): BN => {
  if (denominator.isZero()) {
    throw new DLMMError('Division by zero in math operation', 'DIVISION_BY_ZERO');
  }

  const prod = x.mul(y);

  if (rounding === 'up') {
    // Ceiling division: (prod + denominator - 1) / denominator
    return prod.add(denominator).sub(new BN(1)).div(denominator);
  }

  if (rounding === 'down') {
    return prod.div(denominator);
  }

  throw new DLMMError(`Invalid rounding mode: ${rounding}. Must be 'up' or 'down'`, 'INVALID_ROUNDING_MODE');
};

export const mulShrBN = (x: BN, y: BN, offset: number, rounding: 'up' | 'down'): BN => {
  const denominator = new BN(1).shln(offset); // Left shift by offset bits
  return mulDivBN(x, y, denominator, rounding);
};

export const shlDivBN = (x: BN, y: BN, offset: number, rounding: 'up' | 'down'): BN => {
  const scaledX = x.shln(offset); // Left shift x by offset bits
  return mulDivBN(scaledX, new BN(1), y, rounding);
};

// BN version of divRem for completeness
export const divRemBN = (numerator: BN, denominator: BN): [BN, BN] => {
  if (denominator.isZero()) {
    throw new DLMMError('Division by zero in math operation', 'DIVISION_BY_ZERO');
  }

  const quotient = numerator.div(denominator);
  const remainder = numerator.mod(denominator);

  return [quotient, remainder];
};
