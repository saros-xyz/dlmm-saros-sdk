import { MODE } from '../types';

export const RPC_CONFIG = {
  [MODE.TESTNET]: {
    rpc: 'https://api.testnet.solana.com',
  },
  [MODE.DEVNET]: {
    rpc: 'https://api.devnet.solana.com',
  },
  [MODE.MAINNET]: {
    rpc: 'https://api.mainnet-beta.solana.com',
  },
};


export const ACTIVE_ID = 8388608; // 2^23
export const BIN_ARRAY_SIZE = 256;
export const BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
export const MAX_BASIS_POINTS = 10_000;
export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const PRECISION = 1_000_000_000;
export const VARIABLE_FEE_PRECISION = 100_000_000_000;

export const UNIT_PRICE_DEFAULT = 1_000_000;
export const CCU_LIMIT = 400_000;
export const WRAP_SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
export const FIXED_LENGTH = 16;
