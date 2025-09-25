import { PublicKey } from '@solana/web3.js';

/**
 * Swap direction and execution mode
 */
export interface SwapOptions {
  /** Swap direction: true = X to Y, false = Y to X */
  swapForY: boolean;
  /** Execution mode: true = exact input amount, false = exact output amount */
  isExactInput: boolean;
}

/**
 * Parameters for executing a swap transaction
 */
export interface SwapParams {
  /** Token being sold */
  tokenIn: PublicKey;
  /** Token being bought */
  tokenOut: PublicKey;
  /** Amount to swap */
  amount: bigint;
  /** Swap direction and execution mode */
  options: SwapOptions;
  /** Minimum acceptable output amount (slippage protection) */
  minTokenOut: bigint;
  /** Wallet executing the swap */
  payer: PublicKey;
  /** Optional, if you have a hook for reward */
  hook?: PublicKey;
}

/**
 * Parameters for getting a swap quote
 */
export interface QuoteParams {
  /** Amount to quote */
  amount: bigint;
  /** Swap direction and execution mode */
  options: SwapOptions;
  /** Maximum allowed slippage as percentage (0-100) */
  slippage: number;
}

/**
 * Parameters for executing a swap transaction (static factory method)
 */
export interface StaticSwapParams extends SwapParams {
  /** The DLMM pair address */
  pair: PublicKey;
}

/**
 * Parameters for getting a swap quote (static factory method)
 */
export interface StaticQuoteParams extends QuoteParams {
  /** The DLMM pair address */
  pair: PublicKey;
}

/**
 * Swap quote information
 */
export interface QuoteResponse {
  /** Required input amount */
  amountIn: bigint;
  /** Expected output amount */
  amountOut: bigint;
  /** Price impact as percentage */
  priceImpact: number;
  /** Amount with slippage applied */
  amount: bigint;
  /** Minimum output amount with slippage */
  minTokenOut: bigint;
}

/**
 * Parameters for calculating theoretical maximum output with known token decimals
 */
export interface GetMaxAmountOutWithFeeParams {
  /** Input amount in token's smallest unit */
  amount: bigint;
  /** Swap direction: true = X to Y, false = Y to X */
  swapForY?: boolean;
  /** Number of decimal places for base token */
  decimalBase?: number;
  /** Number of decimal places for quote token */
  decimalQuote?: number;
}

/**
 * Parameters for calculating theoretical maximum output (static factory method)
 */
export interface StaticGetMaxAmountOutWithFeeParams extends GetMaxAmountOutWithFeeParams {
  /** The DLMM pair address */
  pair: PublicKey;
}

/**
 * Result of theoretical maximum output calculation
 */
export interface GetMaxAmountOutWithFeeResponse {
  /** Maximum possible output amount (accounting for fees but not slippage) */
  maxAmountOut: bigint;
  /** Current price in the pair using specified decimals */
  price: number;
}
