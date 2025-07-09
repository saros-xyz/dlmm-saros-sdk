import { Commitment, ConnectionConfig, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

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

export type StaticFeeParameters = {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  maxVolatilityAccumulator: number;
  protocolShare: number;
  space: Uint8Array;
};

export type DynamicFeeParameters = {
  timeLastUpdated: bigint;
  volatilityAccumulator: number;
  volatilityReference: number;
  idReference: number;
  space: Uint8Array;
};

export type PairInfo = {
  bump: Uint8Array;
  liquidityBookConfig: PublicKey;
  binStep: number;
  binStepSeed: Uint8Array;
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  staticFeeParameters: StaticFeeParameters;
  activeId: number;
  dynamicFeeParameters: DynamicFeeParameters;
  protocolFeesX: BN;
  protocolFeesY: BN;
  hook: PublicKey | null;
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
