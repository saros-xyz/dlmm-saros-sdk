import { PublicKey } from '@solana/web3.js';

// TODO: create single interface for optional params
// for both swap and quote
export interface SwapOptions {
  isExactInput?: boolean;
}

// Swap operation parameters
export interface SwapParams {
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  amount: bigint;
  // what is otherAmountOffset? Why is the user required to provide it?
  otherAmountOffset: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  pair: PublicKey;
  hook: PublicKey;
  payer: PublicKey;
  // why is slippage not a parameter for swap?
}

// Quote/output calculation parameters
export interface QuoteParams {
  pair: PublicKey;
  amount: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  slippage: number;
}

// Quote/output calculation response
export interface QuoteResponse {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  amount: bigint;
  otherAmountOffset: bigint;
}
