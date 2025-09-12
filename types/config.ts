import { Commitment, ConnectionConfig, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export enum MODE {
  TESTNET = "testnet",
  DEVNET = "devnet",
  MAINNET = "mainnet",
}

export interface ILiquidityBookConfig {
  mode: MODE;
  options?: {
    rpcUrl: string;
    commitmentOrConfig?: Commitment | ConnectionConfig
  }
}

export type Bin = {
  reserveX: number;
  reserveY: number;
  totalSupply: number;
};
export type BinArray = {
  bins: Bin[];
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
