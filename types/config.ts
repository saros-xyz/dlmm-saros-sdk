import { BN } from '@coral-xyz/anchor';

export type BinAccount = {
  reserveX: BN;
  reserveY: BN;
  totalSupply: BN;
};

export type BinArrayAccount = {
  bins: BinAccount[];
  index: number;
};

export interface TokenInfo {
  mintAddress: string;
  decimals: number;
}

export interface TokenInfoWithReserve extends TokenInfo {
  reserve: string;
}

export interface PairMetadata {
  pair: string;
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
    hook?: string;
  };
}
