import { PublicKey } from '@solana/web3.js';
import { MODE } from '../types';

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

export const FIXED_LENGTH = 16;
export const MAX_BIN_CROSSINGS = 30; // Maximum number of bins that can be crossed in a swap
export const SCALE_OFFSET = 64;
export const BIN_ARRAY_SIZE = 256;
export const ACTIVE_ID = 8388608; // 2^23

export const MAX_BASIS_POINTS = 10_000;
export const CCU_LIMIT = 400_000;
export const UNIT_PRICE_DEFAULT = 1_000_000;
export const VARIABLE_FEE_PRECISION = 100_000_000_000;

export const BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
export const PRECISION_BIGINT = BigInt(1_000_000_000);
export const MAX_BASIS_POINTS_BIGINT = BigInt(MAX_BASIS_POINTS);

export const WRAP_SOL_PUBKEY = new PublicKey('So11111111111111111111111111111111111111112');
