import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

/**
 * Account structure for a Pair
 */
export interface Pair {
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

/**
 * a User Position within a Pair
 */
export interface PositionAccount {
  pair: PublicKey;
  /** position NFT */
  positionMint: PublicKey;
  /** position PDA */
  position: PublicKey;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
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
