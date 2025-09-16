import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface PoolMetadata {
  poolAddress: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  tradeFee: number;
  extra: {
    hook?: string;
  };
}

export interface TokenInfo {
  mintAddress: string;
  decimals: number;
  reserve: string;
  // TODO: consider adding quote price to response
  // currentPrice?: string
}

export interface BinReserveInfo {
  reserveX: bigint;
  reserveY: bigint;
  totalSupply: bigint;
  liquidityShare: bigint;
  binId: number;
  binPosition: number;
}

export interface PositionInfo {
  positionMint: PublicKey;
  position: string;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
}
