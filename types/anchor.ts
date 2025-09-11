// types/anchor.ts
import { BN, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface PairAccount {
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
  };
  activeId: number;
  dynamicFeeParameters: {
    timeLastUpdated: BN;
    volatilityAccumulator: number;
    volatilityReference: number;
    idReference: number;
  };
  protocolFeesX: BN;
  protocolFeesY: BN;
  hook: PublicKey | null;
}

export interface BinArrayAccount {
  index: number;
  bins: BinAccount[];
}

export interface BinAccount {
  reserveX: BN;
  reserveY: BN;
  totalSupply: BN;
}

export interface PositionAccount {
  pair: PublicKey;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
}

// Add a typed program interface
export interface LiquidityBookProgram extends Program<Idl> {
  account: {
    pair: {
      fetch(address: PublicKey): Promise<PairAccount>;
    };
    position: {
      fetch(address: PublicKey): Promise<PositionAccount>;
    };
    binArray: {
      fetch(address: PublicKey): Promise<BinArrayAccount>;
    };
  };
}
