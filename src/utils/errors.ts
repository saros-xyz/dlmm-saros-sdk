export enum SarosDLMMErrorCode {
  // Pair errors
  PairFetchFailed = 'PAIR_FETCH_FAILED',
  NoPairFound = 'NO_PAIR_FOUND',
  InvalidPrice = 'INVALID_PRICE',
  InvalidBinStep = 'INVALID_BIN_STEP',
  PairCreationFailed = 'PAIR_CREATION_FAILED',

  // Swap errors
  ZeroAmount = 'ZERO_AMOUNT',
  InvalidSlippage = 'INVALID_SLIPPAGE',
  BinHasNoReserves = 'BIN_NO_RESERVES',
  SwapExceedsMaxBinCrossings = 'MAX_BIN_CROSSINGS',
  NoValidBinArrays = 'NO_VALID_BIN_ARRAYS',
  BinArrayIndexMismatch = 'BIN_ARRAY_INDEX_MISMATCH',

  // Position errors
  CannotAddZero = 'CANNOT_ADD_ZERO',
  InvalidShape = 'INVALID_SHAPE',
  InvalidBinRange = 'INVALID_BIN_RANGE',

  // Account errors
  AccountFetchFailed = 'ACCOUNT_FETCH_FAILED',
  TokenMintNotFound = 'TOKEN_MINT_NOT_FOUND',
  BinArrayNotFound = 'BIN_ARRAY_NOT_FOUND',

  // Generic operation errors
  QuoteCalculationFailed = 'QUOTE_CALCULATION_FAILED',
  TransactionNotFound = 'TRANSACTION_NOT_FOUND',
  BinArrayInfoFailed = 'BIN_ARRAY_INFO_FAILED',
}

export class SarosDLMMError extends Error {
  constructor(
    message: string,
    public code: SarosDLMMErrorCode
  ) {
    super(message);
    this.name = 'SarosDLMMError';
  }

  // --------------------------
  // Pair errors
  // --------------------------
  static PairFetchFailed(): SarosDLMMError {
    return new SarosDLMMError('Failed to fetch pair account', SarosDLMMErrorCode.PairFetchFailed);
  }
  static NoPairFound(): SarosDLMMError {
    return new SarosDLMMError('No pairs found', SarosDLMMErrorCode.NoPairFound);
  }
  static InvalidPrice(): SarosDLMMError {
    return new SarosDLMMError('Invalid price provided', SarosDLMMErrorCode.InvalidPrice);
  }
  static InvalidBinStep(): SarosDLMMError {
    return new SarosDLMMError('Invalid bin step provided', SarosDLMMErrorCode.InvalidBinStep);
  }
  static PairCreationFailed(): SarosDLMMError {
    return new SarosDLMMError('Failed to create pair', SarosDLMMErrorCode.PairCreationFailed);
  }

  // --------------------------
  // Swap errors
  // --------------------------
  static ZeroAmount(): SarosDLMMError {
    return new SarosDLMMError('Amount cannot be zero', SarosDLMMErrorCode.ZeroAmount);
  }
  static InvalidSlippage(): SarosDLMMError {
    return new SarosDLMMError('Invalid slippage percentage', SarosDLMMErrorCode.InvalidSlippage);
  }
  static BinHasNoReserves(): SarosDLMMError {
    return new SarosDLMMError('Bin has no reserves', SarosDLMMErrorCode.BinHasNoReserves);
  }
  static SwapExceedsMaxBinCrossings(): SarosDLMMError {
    return new SarosDLMMError('Swap exceeds maximum bin crossings', SarosDLMMErrorCode.SwapExceedsMaxBinCrossings);
  }
  static NoValidBinArrays(): SarosDLMMError {
    return new SarosDLMMError('No valid bin arrays found for swap', SarosDLMMErrorCode.NoValidBinArrays);
  }
  static BinArrayIndexMismatch(): SarosDLMMError {
    return new SarosDLMMError('Bin arrays do not form a valid range', SarosDLMMErrorCode.BinArrayIndexMismatch);
  }

  // --------------------------
  // Position errors
  // --------------------------
  static CannotAddZero(): SarosDLMMError {
    return new SarosDLMMError('Cannot add zero liquidity', SarosDLMMErrorCode.CannotAddZero);
  }

  static InvalidShape(): SarosDLMMError {
    return new SarosDLMMError('Unsupported liquidity shape', SarosDLMMErrorCode.InvalidShape);
  }

  static InvalidBinRange(): SarosDLMMError {
    return new SarosDLMMError('Invalid binRange: minBin must be <= maxBin', SarosDLMMErrorCode.InvalidBinRange);
  }

  // --------------------------
  // Account fetch errors
  // --------------------------
  static AccountFetchFailed(): SarosDLMMError {
    return new SarosDLMMError('Failed to fetch account data', SarosDLMMErrorCode.AccountFetchFailed);
  }
  static TokenMintNotFound(address?: string): SarosDLMMError {
    const msg = address ? `Token mint account not found: ${address}` : 'Token mint account not found';
    return new SarosDLMMError(msg, SarosDLMMErrorCode.TokenMintNotFound);
  }

  static BinArrayNotFound(address?: string): SarosDLMMError {
    const msg = address ? `Bin array account not found: ${address}` : 'Bin array account not found';
    return new SarosDLMMError(msg, SarosDLMMErrorCode.BinArrayNotFound);
  }

  // --------------------------
  // Generic operation errors
  // --------------------------
  static QuoteCalculationFailed(): SarosDLMMError {
    return new SarosDLMMError('Quote calculation failed', SarosDLMMErrorCode.QuoteCalculationFailed);
  }
  static TransactionNotFound(): SarosDLMMError {
    return new SarosDLMMError('Transaction not found', SarosDLMMErrorCode.TransactionNotFound);
  }
  static BinArrayInfoFailed(): SarosDLMMError {
    return new SarosDLMMError('Failed to get bin array info', SarosDLMMErrorCode.BinArrayInfoFailed);
  }

  // --------------------------
  // Utilities
  // --------------------------
  static handleError(error: unknown, fallbackError: SarosDLMMError): never {
    if (error instanceof SarosDLMMError) throw error;
    throw fallbackError;
  }
}
