export class DLMMError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DLMMError';
  }
}
