export class PoolServiceError extends Error {
  static PoolNotFound = new PoolServiceError('Pool not found');
  static PoolCreationFailed = new PoolServiceError('Pool creation failed');
  static InvalidPrice = new PoolServiceError('Price must be greater than 0');
  static InvalidBinStep = new PoolServiceError('Bin step invalid. Must be between 1 and 10000');

  constructor(message: string) {
    super(message);
    this.name = 'PoolServiceError';
  }
}
