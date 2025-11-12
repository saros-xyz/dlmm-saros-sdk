import { PublicKey, Transaction } from '@solana/web3.js';
import { LiquidityShape, RemoveLiquidityType } from '../constants/config';

/** Parameters for retrieving all user positions in a specific pair */
export interface GetUserPositionsParams {
  /** The wallet/account that owns the positions */
  payer: PublicKey;
}

/** Parameters for creating a new liquidity position */
export interface CreatePositionParams {
  /** The wallet that will own the position and pay transaction fees */
  payer: PublicKey;
  /** The NFT mint that will represent this position */
  positionMint: PublicKey;
  /** Bin range [minBin, maxBin] relative to the current active bin */
  binRange: [number, number];
}

/** Parameters for adding liquidity by a LiquidityShape to an existing position */
export interface AddLiquidityByShapeParams {
  /** The NFT mint representing the position to add liquidity to */
  positionMint: PublicKey;
  /** The wallet providing the liquidity and paying transaction fees */
  payer: PublicKey;
  /** Optional pre-built transaction to append instructions to */
  transaction?: Transaction;
  /** The distribution shape for the liquidity (Spot, Curve, Bid, Ask) */
  liquidityShape: LiquidityShape;
  /** Amount of base token to add (in token's smallest unit) */
  amountTokenX: bigint;
  /** Amount of quote token to add (in token's smallest unit) */
  amountTokenY: bigint;
  /** Bin range [minBin, maxBin] relative to the current active bin */
  binRange: [number, number];
}

/** Parameters for removing 1 or more liquidity positions */
export interface RemoveLiquidityParams {
  /** List of NFT position mints to remove liquidity from */
  positionMints: PublicKey[];
  /** The wallet that owns the positions and will receive the tokens */
  payer: PublicKey;
  /** Type of removal: All tokens, TokenX only, or TokenY only */
  type: RemoveLiquidityType;
}

/** Response containing all transactions for liquidity removal including account setup and cleanup */
export interface RemoveLiquidityResponse {
  /** Execute FIRST if present - creates any required token accounts */
  setupTransaction?: Transaction;
  /** Execute SECOND - main liquidity removal transactions (always present) */
  transactions: Transaction[];
  /** Execute LAST if present - closes empty accounts and unwraps SOL */
  cleanupTransaction?: Transaction;
  /** List of position mint addresses that will be completely closed and burned */
  closedPositions: PublicKey[];
}

/** Detailed balance information for a single bin within a position */
export interface PositionReserve {
  /** Amount of tokenX reserves in this bin */
  reserveX: bigint;
  /** Amount of tokenY reserves in this bin */
  reserveY: bigint;
  /** Total liquidity supply in this bin across all positions */
  totalSupply: bigint;
  /** User's share of liquidity in this specific bin */
  liquidityShare: bigint;
  /** The absolute bin ID */
  binId: number;
  /** Index of this bin within the user's position range (0-based) */
  binPosition: number;
}

export interface ClaimRewardParams {
  payer: PublicKey;
  positionMint: PublicKey;
  rewardTokenMint: PublicKey;
  transaction?: Transaction;
}
