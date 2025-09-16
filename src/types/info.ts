import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface PoolMetadata {
  poolAddress: string;
  baseToken: TokenInfoWithReserve;
  quoteToken: TokenInfoWithReserve;
  tradeFee: number;
  extra: {
    hook?: string;
  };
  // TODO: consider adding quote price to response
  // currentPrice?: string
}

export interface BaseTokenInfo {
  mintAddress: string;
  decimals: number;
}

export interface TokenInfoWithReserve extends BaseTokenInfo {
  reserve: string;
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
