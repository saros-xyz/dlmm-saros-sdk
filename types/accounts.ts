import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Raw Anchor account types
// TODO: create remaining account types
// consider using auto-generation from IDL (codeama)
export interface DLMMPairAccount {
  bump: number[];
  liquidityBookConfig: PublicKey;
  binStep: number;
  binStepSeed: number[];
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  staticFeeParameters: {
    baseFactor: number;
    filterPeriod: number;
    decayPeriod: number;
    reductionFactor: number;
    variableFeeControl: number;
    maxVolatilityAccumulator: number;
    protocolShare: number;
    space: [number, number];
  };
  activeId: number;
  dynamicFeeParameters: {
    timeLastUpdated: BN;
    volatilityAccumulator: number;
    volatilityReference: number;
    idReference: number;
    space: [number, number, number, number];
  };
  protocolFeesX: BN;
  protocolFeesY: BN;
  hook: PublicKey | null;
}

export interface PositionAccount {
  pair: PublicKey;
  positionMint: PublicKey;
  position: string;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
}
