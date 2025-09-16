import { PublicKey, Transaction } from '@solana/web3.js';
import { RemoveLiquidityType } from '../config';

// Add liquidity operations
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

// Position operations
export interface CreatePositionParams {
  payer: PublicKey;
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
  pair: PublicKey;
  positionMint: PublicKey;
  transaction: Transaction;
}

// liquidity distribution shape
export interface Distribution {
  relativeBinId: number;
  distributionX: number;
  distributionY: number;
}
