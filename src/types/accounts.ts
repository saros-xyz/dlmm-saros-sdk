import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Account structure for a Pair
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

/**
 * Bin data for for a single price bin
 */
export interface Bin {
  /** Token X (base token) reserves in this bin */
  reserveX: BN;
  /** Token Y (base token) reserves in this bin */
  reserveY: BN;
  /** Total liquidity supply in this bin across all positions */
  totalSupply: BN;
}

/**
 * Collection of bins with their array index
 */
export interface BinArray {
  /** Array of bin data structures */
  bins: Bin[];
  /** The bin array index on-chain */
  index: number;
}
