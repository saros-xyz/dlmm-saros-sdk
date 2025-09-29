import { PublicKey, Transaction } from '@solana/web3.js';
import { RemoveLiquidityType, LiquidityShape } from '../constants';
import { BN } from '@coral-xyz/anchor';

/**
 * Parameters for creating a new liquidity position
 */
export interface CreatePositionParams {
  /** The wallet that will own the position and pay transaction fees */
  payer: PublicKey;
  binIdLeft: number;
  binIdRight: number;
  pair: PublicKey;
  binArrayIndex: number;
  /** The NFT mint that will represent this position */
  positionMint: PublicKey;
  /** Optional transaction to add ixn to */
  transaction?: Transaction;
}

/**
 * Parameters for creating a new liquidity position
 */
export interface CreatePositionResponse {
  /** The wallet that will own the position and pay transaction fees */
  position: PublicKey;
  transaction: Transaction;
}

/**
 * Parameters for adding liquidity to an existing position using a specific shape
 */
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

/**
 * Parameters for removing liquidity from positions
 */
export interface RemoveLiquidityParams {
  /** List of NFT position mints to remove liquidity from */
  positionMints: PublicKey[];
  /** The wallet that owns the positions and will receive the tokens */
  payer: PublicKey;
  /** Type of removal: All tokens, TokenX only, or TokenY only */
  type: RemoveLiquidityType;
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
  closedPositions: PublicKey[];
}

/**
 * Parameters for retrieving detailed bin-by-bin balances of a position
 */
export interface GetPositionReserveParams {
  /** The position account address (derived from position mint) */
  position: PublicKey;
  /** The wallet that owns the position */
  payer: PublicKey;
}

export interface PositionBinReserve {
  reserveX: number;
  reserveY: number;
  totalSupply: BN;
  liquidityShare: BN;
  binId: number;
}

export interface GetBinArrayParams {
  binArrayIndex: number;
  pair: PublicKey;
  payer?: PublicKey;
  transaction?: Transaction;
}

export interface Distribution {
  relativeBinId: number;
  distributionX: number;
  distributionY: number;
}

export interface AddLiquidityIntoPositionParams {
  positionMint: PublicKey;
  payer: PublicKey;
  transaction: Transaction;
  liquidityDistribution: Distribution[];
  amountX: bigint; // precise integer
  amountY: bigint; // precise integer
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
}
