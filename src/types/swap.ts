import { PublicKey } from '@solana/web3.js';

interface Options {
  swapForY: boolean; // true = X to Y, false = Y to X
  isExactInput: boolean;
}

export interface SwapParams {
  tokenIn: PublicKey; // tokenX
  tokenOut: PublicKey; // tokenY
  amount: bigint;
  options: Options;
  minTokenOut: bigint; // The minimum amount of tokenOut
  pair: PublicKey;
  hook: PublicKey;
  payer: PublicKey;
}

export interface QuoteParams {
  pair: PublicKey;
  amount: bigint;
  options: Options;
  slippage: number; // allowed slippage as a percentage (0-100)
}

export interface QuoteResponse {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // price impact as percentage (0-100)
  amount: bigint;
  /** Slippage-adjusted threshold - unclear naming, consider minAmountOut/maxAmountIn */
  minTokenOut: bigint;
}
