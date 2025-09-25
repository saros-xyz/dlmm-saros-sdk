/**
 * Unified error classes for the Saros DLMM SDK
 */

export class SarosDLMMError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SarosDLMMError';
  }
}

/**
 * Pair/Pool related errors
 */
export class PairServiceError extends SarosDLMMError {
  static readonly Pair = new PairServiceError('Failed to fetch pair account', 'PAIR_FETCH_FAILED');
  static readonly NoPairFound = new PairServiceError('No pairs found', 'NO_PAIR_FOUND');
  static readonly InvalidPrice = new PairServiceError('Invalid price provided', 'INVALID_PRICE');
  static readonly InvalidBinStep = new PairServiceError('Invalid bin step provided', 'INVALID_BIN_STEP');
  static readonly PairCreationFailed = new PairServiceError('Failed to create pair', 'PAIR_CREATION_FAILED');

  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'PairServiceError';
  }
}

/**
 * Swap related errors
 */
export class SwapServiceError extends SarosDLMMError {
  static readonly ZeroAmount = new SwapServiceError('Amount cannot be zero', 'ZERO_AMOUNT');
  static readonly InvalidSlippage = new SwapServiceError('Invalid slippage percentage', 'INVALID_SLIPPAGE');
  static readonly BinHasNoReserves = new SwapServiceError('Bin has no reserves', 'BIN_NO_RESERVES');
  static readonly SwapExceedsMaxBinCrossings = new SwapServiceError('Swap exceeds maximum bin crossings', 'MAX_BIN_CROSSINGS');
  static readonly NoValidBinArrays = new SwapServiceError('No valid bin arrays found for swap', 'NO_VALID_BIN_ARRAYS');

  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'SwapServiceError';
  }
}

/**
 * Position related errors
 */
export class PositionServiceError extends SarosDLMMError {
  static readonly CannotAddZero = new PositionServiceError('Cannot add zero liquidity', 'CANNOT_ADD_ZERO');
  static readonly PositionNotFound = new PositionServiceError('Position not found', 'POSITION_NOT_FOUND');
  static readonly InsufficientLiquidity = new PositionServiceError('Insufficient liquidity', 'INSUFFICIENT_LIQUIDITY');

  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'PositionServiceError';
  }
}