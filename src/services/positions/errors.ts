// TODO: add Position related errors here and use within service and helpers
export class PositionService extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PositionServiceError';
  }
}
