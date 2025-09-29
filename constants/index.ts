import { PublicKey } from '@solana/web3.js';

export enum MODE {
  DEVNET = 'devnet',
  MAINNET = 'mainnet',
  // TESTNET = 'testnet',
}

export enum LiquidityShape {
  /** Distributes liquidity uniformly across the selected price range */
  Spot = 'Spot',
  /** Distributes liquidity in a bell curve/gaussian distribution centered around active bin */
  Curve = 'Curve',
  /** Distributes liquidity with linear weighting - higher concentration on the edges */
  BidAsk = 'BidAsk',
}

export enum RemoveLiquidityType {
  All = 'All',
  TokenX = 'TokenX',
  TokenY = 'TokenY',
}

export const RPC_CONFIG = {
  [MODE.DEVNET]: {
    rpc: 'https://api.devnet.solana.com',
  },
  [MODE.MAINNET]: {
    rpc: 'https://api.mainnet-beta.solana.com',
  },
  //   [MODE.TESTNET]: {
  //     rpc: 'https://api.testnet.solana.com',
  //   },
};

export const DLMM_PROGRAM_IDS: Record<MODE, { lb: PublicKey; hooks: PublicKey }> = {
  [MODE.MAINNET]: {
    lb: new PublicKey('BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8'),
    hooks: new PublicKey('DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF'),
  },
  [MODE.DEVNET]: {
    lb: new PublicKey('DK6EoxvbMxJTkgcTAYfUnKyDZUTKb6wwPUFfpWsgeiR9'),
    hooks: new PublicKey('2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES'),
  },
};

export const CENTER_BIN_ID = 8388608; // 2^23
export const BIN_ARRAY_SIZE = 256;
export const BIN_ARRAY_INDEX = CENTER_BIN_ID / BIN_ARRAY_SIZE - 1;
export const MAX_BASIS_POINTS = 10_000;
export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const PRECISION = 1_000_000_000;
export const VARIABLE_FEE_PRECISION = 100_000_000_000;

export const UNIT_PRICE_DEFAULT = 1_000_000;
export const CCU_LIMIT = 400_000;
export const WRAP_SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
export const FIXED_LENGTH = 16;
export const MAX_BIN_CROSSINGS = 30; // max bin crossings allowed for a swap
