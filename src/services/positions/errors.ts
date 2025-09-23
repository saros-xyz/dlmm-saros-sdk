// TODO: add Position related errors here and use within service and helpers
export class PositionServiceError extends Error {
  static CannotAddZero = new PositionServiceError(
    'Cannot add zero liquidity - at least one amount must be greater than 0.'
  );

  constructor(message: string) {
    super(message);
    this.name = 'PositionServiceError';
  }
}
