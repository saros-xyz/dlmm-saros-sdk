export class PoolServiceError extends Error {
  static PoolNotFound = new PoolServiceError('Pool not found');
  static BinStepConfigNotFound = new PoolServiceError('Bin step config not found');
  static QuoteAssetBadgeNotFound = new PoolServiceError('Quote asset badge not found');
  static PoolCreationFailed = new PoolServiceError('Pool creation failed');

  constructor(message: string) {
    super(message);
    this.name = 'PoolServiceError';
  }
}
