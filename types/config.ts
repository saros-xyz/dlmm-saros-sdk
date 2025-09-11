import { BN } from "@coral-xyz/anchor";
import { Commitment, ConnectionConfig } from "@solana/web3.js";

export enum MODE {
  TESTNET = "testnet",
  DEVNET = "devnet",
  MAINNET = "mainnet",
}

export interface ILiquidityBookConfig {
  mode: MODE;
  options?: {
    rpcUrl: string;
    commitmentOrConfig?: Commitment | ConnectionConfig;
  };
}

export type BinAccount = {
  reserveX: BN;
  reserveY: BN;
  totalSupply: BN;
};

export type BinArrayAccount = {
  bins: BinAccount[];
  index: number;
};

export interface PoolMetadata {
  poolAddress: string;
  baseMint: string;
  baseReserve: string;
  quoteMint: string;
  quoteReserve: string;
  tradeFee: number;
  extra: {
    hook?: string;
    tokenQuoteDecimal: number;
    tokenBaseDecimal: number;
  };
}
