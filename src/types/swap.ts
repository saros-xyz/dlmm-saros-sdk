import { PublicKey } from '@solana/web3.js';

export interface SwapParams {
  // TODO: consider rename to inputToken/outputToken - tokenMintX/Y is unclear which is which
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  amount: bigint;
  /** Slippage protection threshold - unclear naming, consider minAmountOut/maxAmountIn */
  otherAmountOffset: bigint;
  /** Direction: true = X to Y, false = Y to X */
  swapForY: boolean;
  isExactInput: boolean;
  pair: PublicKey;
  hook: PublicKey;
  payer: PublicKey;
}

export interface QuoteParams {
  pair: PublicKey;
  amount: bigint;
  /** Direction: true = X to Y, false = Y to X */
  swapForY: boolean;
  isExactInput: boolean;
  /** Slippage percentage (0-100) */
  slippage: number;
}

export interface QuoteResponse {
  amountIn: bigint;
  amountOut: bigint;
  /** Price impact as percentage */
  priceImpact: number;
  amount: bigint;
  /** Slippage-adjusted threshold - unclear naming, consider minAmountOut/maxAmountIn */
  otherAmountOffset: bigint;
}
