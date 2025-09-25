import { PublicKey, Transaction } from '@solana/web3.js';

export interface CreatePairParams {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  /** Determines fee tier and price precision */
  binStep: number;
  /** Initial price to set the active bin */
  ratePrice: number;
  payer: PublicKey;
}

export interface CreatePairResponse {
  /** Transaction to execute */
  transaction: Transaction;
  /** Address of the created LB pair */
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

export interface PairMetadata {
  pair: string;
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

export interface GetPairLiquidityParams {
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

export interface PairLiquidityData {
  activeBin: number;
  binStep: number;
  bins: BinLiquidityData[];
}
