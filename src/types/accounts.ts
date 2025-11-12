import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/** Account structure for a Pair */
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
    space: number[];
  };
  activeId: number;
  dynamicFeeParameters: {
    timeLastUpdated: BN;
    volatilityAccumulator: number;
    volatilityReference: number;
    idReference: number;
    space: number[];
  };
  protocolFeesX: BN;
  protocolFeesY: BN;
  hook: PublicKey | null;
}

export interface HookPositionAccount {
  userAccruedRewardsPerShare: BN[];
  pendingRewards: BN;
  bump: number;
  space: number[];
  user: PublicKey;
}

/** a User Position within a pair */
export interface PositionAccount {
  pair: PublicKey;
  /** position NFT */
  positionMint: PublicKey;
  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
  hookPosition?: HookPositionAccount;
}

/** Bin data for for a single price bin */
export interface Bin {
  /** Token X (base token) reserves in this bin */
  reserveX: BN;
  /** Token Y (base token) reserves in this bin */
  reserveY: BN;
  /** Total liquidity supply in this bin */
  totalSupply: BN;
}

/** Collection of bins with their array index */
export interface BinArray {
  /** Array of bin data structures */
  bins: Bin[];
  /** The bin array index on-chain */
  index: number;
}

export interface HookAccount {
  bump: number[];
  authority: PublicKey;
  pair: PublicKey;
  rewardTokenMint: PublicKey;
  hookReserve: PublicKey;
  rewardsPerSecond: BN;
  endTime: BN;
  lastUpdate: BN;
  deltaBinA: number;
  deltaBinB: number;
  totalUnclaimedRewards: BN;
}
