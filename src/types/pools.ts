import { PublicKey } from '@solana/web3.js';

export interface CreatePoolParams {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  /** Determines fee tier and price precision */
  binStep: number;
  /** Initial price to set the active bin */
  ratePrice: number;
  payer: PublicKey;
}

export interface PoolMetadata {
  poolAddress: string;
  baseToken: TokenInfoWithReserve;
  quoteToken: TokenInfoWithReserve;
  tradeFee: number;
  extra: {
    hook?: string;
  };
}

export interface TokenInfo {
  mintAddress: string;
  decimals: number;
}

export interface TokenInfoWithReserve extends TokenInfo {
  reserve: string;
}

export interface GetPoolLiquidityParams {
  poolAddress: PublicKey;
  /** 
   * Number of bin arrays to fetch symmetrically around the active bin.
   * Default is 1, which fetches the active bin array only.
   */  
  numberOfBinArrays?: number;
}

export interface BinLiquidityData {
  binId: number;
  price: number;
  baseReserve: number;
  quoteReserve: number;
}

export interface PoolLiquidityData {
  activeBin: number;
  binStep: number;
  bins: BinLiquidityData[];
}
