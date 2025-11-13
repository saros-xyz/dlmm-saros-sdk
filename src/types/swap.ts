import { PublicKey } from '@solana/web3.js';

/**
 * BigInt Usage Pattern
 * Use native JavaScript `bigint` for all token amounts and calculations.
 * Convert to BN when necessary, i.e. calling Anchor program methods.
 */

/** Swap direction and execution mode */
export interface SwapOptions {
  /** Swap direction: true = X to Y, false = Y to X */
  swapForY: boolean;
  /** Execution mode: true = exact input amount, false = exact output amount */
  isExactInput: boolean;
}

/**
 * Parameters for executing a swap transaction
 *
 * Note: tokenIn/tokenOut are optional legacy fields kept for backward compatibility.
 * Use SwapOptions.swapForY to specify direction instead.
 * Likely best to reexpose swap function from SDK base for backward compatibility with agg partners.
 */
export interface SwapParams {
  /** Token being sold (optional, use options.swapForY for direction) */
  tokenIn?: PublicKey;
  /** Token being bought (optional, use options.swapForY for direction) */
  tokenOut?: PublicKey;
  /**
   * Amount to swap
   * - Exact input: amount of tokenIn to sell
   * - Exact output: amount of tokenOut to receive
   */
  amount: bigint;
  /** Swap direction and execution mode */
  options: SwapOptions;
  /**
   * Slippage protection limit (use quote.minTokenOut)
   * - Exact input: minimum output to accept (reverts if actual < this)
   * - Exact output: maximum input to pay (reverts if actual > this)
   */
  minTokenOut: bigint;
  /** Wallet executing the swap */
  payer: PublicKey;
}

/** Parameters for getting a swap quote */
export interface QuoteParams {
  /** Amount to quote */
  amount: bigint;
  /** Swap direction and execution mode */
  options: SwapOptions;
  /** Maximum allowed slippage as percentage (0-100) */
  slippage: number;
}

/** Swap quote information */
export interface QuoteResponse {
  /** input amount (exact quote without slippage) */
  amountIn: bigint;
  /** Expected output amount (exact quote without slippage) */
  amountOut: bigint;
  /** Price impact as percentage */
  priceImpact: number;
  /**
   * Amount with slippage applied
   * - Exact input: same as amountIn
   * - Exact output: maximum input with slippage
   */
  amount: bigint;
  /**
   * Slippage protection limit (pass this to swap.minTokenOut)
   * - Exact input: minimum output with slippage
   * - Exact output: maximum input with slippage
   */
  minTokenOut: bigint;
}

/** Parameters for calculating theoretical maximum output with known token decimals */
export interface GetMaxAmountOutWithFeeParams {
  /** Input amount in token's smallest unit */
  amount: bigint;
  /** Swap direction: true = X to Y, false = Y to X */
  swapForY?: boolean;
  /** Number of decimal places for token X */
  decimalTokenX?: number;
  /** Number of decimal places for token Y */
  decimalTokenY?: number;
}

/** Get the max amount out including fees */
export interface GetMaxAmountOutWithFeeResponse {
  /** Maximum possible output amount (accounting for fees but not slippage) */
  maxAmountOut: bigint;
  /** Current price in the pair using specified decimals */
  price: number;
}
