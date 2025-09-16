export class SwapServiceError extends Error {
  static BinNotFound = new SwapServiceError("Bin not found");
  static BinArrayIndexMismatch = new SwapServiceError("Bin array index mismatch");

  constructor(message: string) {
    super(message);
    this.name = "LBError";
  }
}