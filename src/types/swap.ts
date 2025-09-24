import { PublicKey } from '@solana/web3.js';

/**
 * Swap direction and execution mode
 */
interface SwapOptions {
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
  /** The DLMM pool address */
  poolAddress: PublicKey;
  /** Optional hook program address */
  hook?: PublicKey;
  /** Wallet executing the swap */
  payer: PublicKey;
}

/**
 * Parameters for getting a swap quote
 */
export interface QuoteParams {
  /** The DLMM pool address */
  poolAddress: PublicKey;
  /** Amount to quote */
  amount: bigint;
  /** Swap direction and execution mode */
  options: SwapOptions;
  /** Maximum allowed slippage as percentage (0-100) */
  slippage: number;
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
 * Parameters for theoretical maximum output calculation
 */
export interface MaxAmountOutParams {
  /** The DLMM pool address */
  poolAddress: PublicKey;
  /** Input amount */
  amount: bigint;
  /** Swap direction */
  swapForY?: boolean;
}

/**
 * Theoretical maximum output calculation result
 */
export interface MaxAmountOutResponse {
  /** Maximum possible output amount */
  maxAmountOut: bigint;
  /** Current pool price */
  price: number;
}