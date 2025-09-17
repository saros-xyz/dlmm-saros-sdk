import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Raw on-chain pair account structure - mirrors Anchor program state
 * Referred to as "Pool" in the SDK
 */
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

/**
 * Raw on-chain position account structure - mirrors Anchor program state
 */
export interface PositionAccount {
  pair: PublicKey;
  positionMint: PublicKey;
  position: string;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
}
