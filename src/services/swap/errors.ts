export class SwapServiceError extends Error {
  static BinNotFound = new SwapServiceError('Bin not found');
  static BinArrayIndexMismatch = new SwapServiceError('Bin array index mismatch');
  static BinHasNoReserves = new SwapServiceError(
    'Bin has no reserves for the requested swap direction'
  );
  static InsufficientBinLiquidity = new SwapServiceError(
    'Insufficient liquidity in bin to complete swap'
  );
  static SwapExceedsMaxBinCrossings = new SwapServiceError(
    'Swap crosses too many bins - quote aborted'
  );

  constructor(message: string) {
    super(message);
    this.name = 'SwapServiceError';
  }
}
