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
  pair: PublicKey;
  /** Active bin ID where initial liquidity will be placed */
  activeBin: number;
  /** Bin step for this pair */
  binStep: number;
  /** Lower bin array address */
  binArrayLower: PublicKey;
  /** Upper bin array address */
  binArrayUpper: PublicKey;
  /** Address for hooks configuration */
  hooksConfig: PublicKey;
  /** Token X mint address */
  tokenX: PublicKey;
  /** Token Y mint address */
  tokenY: PublicKey;
}

export interface PairMetadata {
  pair: PublicKey;
  baseToken: TokenInfoWithReserve;
  quoteToken: TokenInfoWithReserve;
  tradeFee: number;
  extra: {
    hook?: PublicKey;
  };
}

export interface TokenInfo {
  mintAddress: PublicKey;
  decimals: number;
}

export interface TokenInfoWithReserve extends TokenInfo {
  reserve: string;
}

export interface GetPairLiquidityParams {
  /**
   * Number of bin arrays to fetch symmetrically around the active bin.
   * Default is 1, the active bin array.
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
