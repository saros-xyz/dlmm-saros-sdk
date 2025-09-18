import { PublicKey, Transaction } from '@solana/web3.js';
import { LiquidityShape, RemoveLiquidityType } from './config';

export interface GetUserPositionsParams {
  payer: PublicKey;
  poolAddress: PublicKey;
}

export interface CreatePositionParams {
  payer: PublicKey;
  poolAddress: PublicKey;
  positionMint: PublicKey;
  /** [minBin, maxBin] relative to active bin */
  binRange: [number, number];
}

export interface AddLiquidityByShapeParams {
  positionMint: PublicKey;
  payer: PublicKey;
  poolAddress: PublicKey;
  transaction: Transaction;
  liquidityShape: LiquidityShape;
  baseAmount: bigint;
  quoteAmount: bigint;
  /** [minBin, maxBin] relative to active bin */
  binRange: [number, number];
}

export interface RemoveLiquidityParams {
  /** list of NFT position mints to be removed */
  positionMints: string[];
  payer: PublicKey;
  type: RemoveLiquidityType;
  poolAddress: PublicKey;
}

export interface RemoveLiquidityResponse {
  transactions: Transaction[];
  setupTransaction?: Transaction;
  cleanupTransaction?: Transaction;
  closedPositions: string[];
}

export interface GetPositionBinBalancesParams {
  position: PublicKey;
  pair: PublicKey;
  payer: PublicKey;
}

export interface PositionBinBalance {
  baseReserve: bigint;
  quoteReserve: bigint;
  totalSupply: bigint;
  /** User's share of liquidity in this bin */
  liquidityShare: bigint;
  binId: number;
  /** Index within the user's position range */
  binPosition: number;
}
