export class SarosDLMMError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'SarosDLMMError';
  }

  // Pair/Pool errors
  static readonly PairFetchFailed = new SarosDLMMError(
    'Failed to fetch pair account',
    'PAIR_FETCH_FAILED'
  );
  static readonly NoPairFound = new SarosDLMMError('No pairs found', 'NO_PAIR_FOUND');
  static readonly InvalidPrice = new SarosDLMMError('Invalid price provided', 'INVALID_PRICE');
  static readonly InvalidBinStep = new SarosDLMMError(
    'Invalid bin step provided',
    'INVALID_BIN_STEP'
  );
  static readonly PairCreationFailed = new SarosDLMMError(
    'Failed to create pair',
    'PAIR_CREATION_FAILED'
  );

  // Swap errors
  static readonly ZeroAmount = new SarosDLMMError('Amount cannot be zero', 'ZERO_AMOUNT');
  static readonly InvalidSlippage = new SarosDLMMError(
    'Invalid slippage percentage',
    'INVALID_SLIPPAGE'
  );
  static readonly BinHasNoReserves = new SarosDLMMError('Bin has no reserves', 'BIN_NO_RESERVES');
  static readonly SwapExceedsMaxBinCrossings = new SarosDLMMError(
    'Swap exceeds maximum bin crossings',
    'MAX_BIN_CROSSINGS'
  );
  static readonly NoValidBinArrays = new SarosDLMMError(
    'No valid bin arrays found for swap',
    'NO_VALID_BIN_ARRAYS'
  );
  static readonly BinArrayIndexMismatch = new SarosDLMMError(
    'Bin arrays do not form a valid range',
    'BIN_ARRAY_INDEX_MISMATCH'
  );

  // Position errors
  static readonly CannotAddZero = new SarosDLMMError(
    'Cannot add zero liquidity',
    'CANNOT_ADD_ZERO'
  );
  static readonly PositionNotFound = new SarosDLMMError('Position not found', 'POSITION_NOT_FOUND');
  static readonly InsufficientLiquidity = new SarosDLMMError(
    'Insufficient liquidity',
    'INSUFFICIENT_LIQUIDITY'
  );

  // Generic operation errors
  static readonly QuoteCalculationFailed = new SarosDLMMError('Quote calculation failed', 'QUOTE_CALCULATION_FAILED');
  static readonly TransactionNotFound = new SarosDLMMError('Transaction not found', 'TRANSACTION_NOT_FOUND');
  static readonly BinArrayInfoFailed = new SarosDLMMError('Failed to get bin array info', 'BIN_ARRAY_INFO_FAILED');

  /**
   * Handle errors by re-throwing SarosDLMMError or wrapping unknown errors
   */
  static handleError(error: unknown, fallbackError: SarosDLMMError): never {
    if (error instanceof SarosDLMMError) {
      throw error;
    }
    throw fallbackError;
  }
}
