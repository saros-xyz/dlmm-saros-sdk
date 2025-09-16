import { PublicKey, Transaction } from '@solana/web3.js';
import { RemoveLiquidityType } from '../config';

// Get user positions for a specific pool
export interface UserPositionsParams {
  payer: PublicKey;
  pair: PublicKey;
}

// Create a position in a specific pool
export interface CreatePositionParams {
  payer: PublicKey;
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
  pair: PublicKey;
  positionMint: PublicKey;
  transaction: Transaction;
}

// Add liquidity into an existing position
export interface AddLiquidityIntoPositionParams {
  positionMint: PublicKey;
  payer: PublicKey;
  pair: PublicKey;
  transaction: Transaction;
  liquidityDistribution: Distribution[];
  amountY: bigint;
  amountX: bigint;
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
}

// Remove liquidity operations
export interface RemoveMultipleLiquidityParams {
  maxPositionList: {
    position: string;
    start: number;
    end: number;
    positionMint: string;
  }[];
  payer: PublicKey;
  type: RemoveLiquidityType;
  pair: PublicKey;
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  activeId: number;
}

export interface RemoveMultipleLiquidityResponse {
  txs: Transaction[];
  txCreateAccount?: Transaction;
  txCloseAccount?: Transaction;
  positionClosed?: Record<string, string>[];
}

// liquidity distribution shape
export interface Distribution {
  relativeBinId: number;
  distributionX: number;
  distributionY: number;
}
