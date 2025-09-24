import { PublicKey, Transaction } from '@solana/web3.js';
import { LiquidityShape, RemoveLiquidityType } from './config';

/**
 * Parameters for retrieving all user positions in a specific pool
 */
export interface GetUserPositionsParams {
  /** The wallet/account that owns the positions */
  payer: PublicKey;
  /** The DLMM pool address to query positions for */
  poolAddress: PublicKey;
}

/**
 * Parameters for creating a new liquidity position
 */
export interface CreatePositionParams {
  /** The wallet that will own the position and pay transaction fees */
  payer: PublicKey;
  /** The DLMM pool address where the position will be created */
  poolAddress: PublicKey;
  /** The NFT mint that will represent this position */
  positionMint: PublicKey;
  /** Bin range [minBin, maxBin] relative to the current active bin */
  binRange: [number, number];
}

/**
 * Parameters for adding liquidity to an existing position using a specific shape
 */
export interface AddLiquidityByShapeParams {
  /** The NFT mint representing the position to add liquidity to */
  positionMint: PublicKey;
  /** The wallet providing the liquidity and paying transaction fees */
  payer: PublicKey;
  /** The DLMM pool address */
  poolAddress: PublicKey;
  /** Optional pre-built transaction to append instructions to */
  transaction?: Transaction;
  /** The distribution shape for the liquidity (Spot, Curve, Bid, Ask) */
  liquidityShape: LiquidityShape;
  /** Amount of base token to add (in token's smallest unit) */
  baseAmount: bigint;
  /** Amount of quote token to add (in token's smallest unit) */
  quoteAmount: bigint;
  /** Bin range [minBin, maxBin] relative to the current active bin */
  binRange: [number, number];
}

/**
 * Parameters for removing liquidity from positions
 */
export interface RemoveLiquidityParams {
  /** List of NFT position mints to remove liquidity from */
  positionMints: PublicKey[];
  /** The wallet that owns the positions and will receive the tokens */
  payer: PublicKey;
  /** Type of removal: All tokens, BaseToken only, or QuoteToken only */
  type: RemoveLiquidityType;
  /** The DLMM pool address */
  poolAddress: PublicKey;
}

/**
 * Response containing all transactions needed to complete liquidity removal
 */
export interface RemoveLiquidityResponse {
  /** Execute FIRST if present - creates any required token accounts */
  setupTransaction?: Transaction;
  /** Execute SECOND - main liquidity removal transactions (always present) */
  transactions: Transaction[];
  /** Execute LAST if present - closes empty accounts and unwraps SOL */
  cleanupTransaction?: Transaction;
  /** List of position mint addresses that will be completely closed and burned */
  closedPositions: string[];
}

/**
 * Parameters for retrieving detailed bin-by-bin balances of a position
 */
export interface GetPositionBinBalancesParams {
  /** The position account address (derived from position mint) */
  position: PublicKey;
  /** The DLMM pool/pair address */
  poolAddress: PublicKey;
  /** The wallet that owns the position */
  payer: PublicKey;
}

/**
 * Parameters for retrieving bin array information from a pool
 */
export interface GetBinArrayInfoParams {
  /** The bin array index to fetch */
  binArrayIndex: number;
  /** The DLMM pool address */
  poolAddress: PublicKey;
  /** The wallet requesting the information (used for transaction context if needed) */
  payer: PublicKey;
}

/**
 * Detailed balance information for a single bin within a position
 */
export interface PositionBinBalance {
  /** Amount of base token reserves in this bin */
  baseReserve: bigint;
  /** Amount of quote token reserves in this bin */
  quoteReserve: bigint;
  /** Total liquidity supply in this bin across all positions */
  totalSupply: bigint;
  /** User's share of liquidity in this specific bin */
  liquidityShare: bigint;
  /** The absolute bin ID */
  binId: number;
  /** Index of this bin within the user's position range (0-based) */
  binPosition: number;
}
