export class PairServiceError extends Error {
  static Pair = new PairServiceError('Pair not found');
  static NoPairFound = new PairServiceError('No Pairs found.');
  static PairCreationFailed = new PairServiceError('Pair creation failed');
  static InvalidPrice = new PairServiceError('Price must be greater than 0');
  static InvalidBinStep = new PairServiceError('Bin step invalid. Must be between 1 and 10000');

  constructor(message: string) {
    super(message);
    this.name = 'PairServiceError';
  }
}
