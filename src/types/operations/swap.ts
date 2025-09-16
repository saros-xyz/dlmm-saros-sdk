import { PublicKey } from '@solana/web3.js';
import { PoolMetadata } from '../info';

// Swap operation parameters
export interface SwapParams {
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  amount: bigint;
  otherAmountOffset: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  pair: PublicKey;
  hook: PublicKey;
  payer: PublicKey;
}

// Quote/output calculation parameters
export interface GetTokenOutputParams {
  pair: PublicKey;
  tokenBase: PublicKey;
  tokenQuote: PublicKey;
  amount: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;
  slippage: number;
}

// Quote/output calculation response
export interface GetTokenOutputResponse {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  amount: bigint;
  otherAmountOffset: bigint;
}


// Quote operations
export interface QuoteParams {
  amount: number;
  metadata: PoolMetadata;
  optional: {
    isExactInput: boolean;
    swapForY: boolean;
    slippage: number;
  };
}