import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { RemoveLiquidityType } from './config';

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
  // TODO: consider rename to leftBinId/rightBinId - remove "relative" for clarity
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
  poolAddress: PublicKey;
  positionMint: PublicKey;
  transaction: Transaction;
}

// TODO: consider shortening to AddLiquidityParams - "IntoPosition" is redundant
export interface AddLiquidityIntoPositionParams {
  positionMint: PublicKey;
  payer: PublicKey;
  poolAddress: PublicKey;
  transaction: Transaction;
  liquidityDistribution: Distribution[];
  // TODO: consider rename to match swap convention (tokenMintX/Y amounts)
  amountY: bigint;
  amountX: bigint;
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
}

// TODO: consider shortening to RemoveLiquidityParams - "Multiple" is implementation detail
export interface RemoveMultipleLiquidityParams {
  // TODO: consider rename to positions - "maxPositionList" is unclear
  maxPositionList: {
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

export interface RemoveMultipleLiquidityResponse {
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
