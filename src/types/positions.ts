import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { LiquidityShape, RemoveLiquidityType } from './config';

export interface GetUserPositionsParams {
  payer: PublicKey;
  poolAddress: PublicKey;
}

export interface PositionInfo {
  positionMint: PublicKey;
  position: string;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
}

export interface CreatePositionParams {
  payer: PublicKey;
  poolAddress: PublicKey;
  positionMint: PublicKey;
  transaction: Transaction;
  binRange: [number, number]; // [minBin, maxBin] relative to active bin
}

// TODO: consider shortening to AddLiquidityParams - "IntoPosition" is redundant
export interface AddLiquidityToPositionParams {
  positionMint: PublicKey;
  payer: PublicKey;
  poolAddress: PublicKey;
  transaction: Transaction;
  liquidityShape: LiquidityShape;
  binRange: [number, number]; // [minBin, maxBin] relative to active bin
  baseAmount: bigint; // renamed from amountX
  quoteAmount: bigint; // renamed from amountY
  // Removed: liquidityDistribution, binArrayLower, binArrayUpper (calculated internally)
}

export interface RemoveLiquidityParams {
  positions: {
    position: string;
    start: number;
    end: number;
    positionMint: string;
  }[];
  payer: PublicKey;
  type: RemoveLiquidityType;
  poolAddress: PublicKey;
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  activeId: number;
}

export interface RemoveLiquidityResponse {
  txs: Transaction[];
  txCreateAccount?: Transaction;
  txCloseAccount?: Transaction;
  positionClosed?: Record<string, string>[];
}

export interface Distribution {
  relativeBinId: number;
  /** Percentage (0-100) */
  distributionX: number;
  /** Percentage (0-100) */
  distributionY: number;
}

export interface PositionBinReserve {
  reserveX: bigint;
  reserveY: bigint;
  totalSupply: bigint;
  /** User's share of liquidity in this bin */
  liquidityShare: bigint;
  binId: number;
  /** Index within the user's position range */
  binPosition: number;
}
