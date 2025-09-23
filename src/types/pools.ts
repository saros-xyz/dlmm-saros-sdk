import { PublicKey, Transaction } from '@solana/web3.js';

export interface CreatePoolParams {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  /** Determines fee tier and price precision */
  binStep: number;
  /** Initial price to set the active bin */
  ratePrice: number;
  payer: PublicKey;
}

export interface CreatePoolResponse {
  /** Transaction to execute */
  transaction: Transaction;
  /** Address of the created pool pair */
  pair: string;
  /** Active bin ID where initial liquidity will be placed */
  activeBin: number;
  /** Lower bin array address */
  binArrayLower: string;
  /** Upper bin array address */
  binArrayUpper: string;
  /** Address for hooks configuration */
  hooksConfig: string;
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
