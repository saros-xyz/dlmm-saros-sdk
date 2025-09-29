import { PublicKey, Transaction } from '@solana/web3.js';

export interface CreatePairParams {
  /** tokenX = your base token */
  tokenX: TokenInfo;
  /** tokenY = your quote token */
  tokenY: TokenInfo;
  /** Determines fee tier and price precision */
  binStep: number;
  /** Initial price to set the active bin */
  ratePrice: number;
  /** Transaction payer and signer */
  payer: PublicKey;
}

export interface CreatePairResponse {
  /** Transaction to execute */
  transaction: Transaction;
  /** Address of the created LB pair */
  pair: PublicKey;
  /** Active bin ID where initial liquidity will be placed */
  activeBin: number;
  /** Lower bin array address */
  binArrayLower: PublicKey;
  /** Upper bin array address */
  binArrayUpper: PublicKey;
  /** Address for hooks configuration */
  hooksConfig: PublicKey;
}

export interface PairMetadata {
  pair: PublicKey;
  tokenX: TokenInfoWithReserve;
  tokenY: TokenInfoWithReserve;
  binStep: number;
  /** Base fee as a percentage (e.g. 1 => 1%) */
  baseFee: number;
  /** Dynamic fee as a percentage (e.g. 0.01 => 0.01%) */
  dynamicFee: number;
  /** Protocol fee as a percentage of the dynamic fee (e.g. 0.002 => 0.002%) */
  protocolFee: number;
  extra: {
    hook?: PublicKey;
  };
}

export interface TokenInfo {
  mintAddress: PublicKey;
  decimal: number;
}

export interface TokenInfoWithReserve extends TokenInfo {
  reserve: string;
}
