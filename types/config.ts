import { Idl, Program } from "@coral-xyz/anchor";
import { Commitment, ConnectionConfig, PublicKey } from "@solana/web3.js";
import { Pair, PositionInfo } from "./services";

export enum MODE {
  TESTNET = "testnet",
  DEVNET = "devnet",
  MAINNET = "mainnet",
}

export type LiquidityBookConfig = {
  baseFactor: number;
  binStep: number;
  activeId: number;
  binArraySize: number;
  binArrayIndex: number;
  maxBasisPoints: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  maxVolatilityAccumulator: number;
  protocolShare: number;
  startTime: number;
  rewardsDuration: number;
  rewardsPerSecond: number;
};

export interface ILiquidityBookConfig {
  mode: MODE;
  options?: {
    rpcUrl: string;
    commitmentOrConfig?: Commitment | ConnectionConfig;
  };
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

// Add a typed program interface
export interface LiquidityBookProgram extends Program<Idl> {
  account: {
    pair: {
      fetch(address: PublicKey): Promise<Pair>;
    };
    position: {
      fetch(address: PublicKey): Promise<PositionInfo>; // Keep if this was also original
    };
    binArray: {
      fetch(address: PublicKey): Promise<BinArray>; // Keep if this was also original
    };
  };
}
