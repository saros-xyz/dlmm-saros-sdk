import { MODE } from "../types";

export const CONFIG = {
  [MODE.TESTNET]: {
    rpc: "https://api.testnet.solana.com",
  },
  [MODE.DEVNET]: {
    rpc: "https://api.devnet.solana.com",
  },
  [MODE.MAINNET]: {
    rpc: "https://api.mainnet-beta.solana.com",
  },
};

export const BASE_FACTOR = 8_000;
export const BIN_STEP = 1;
export const ACTIVE_ID = 8388608;
export const BIN_ARRAY_SIZE = 256;
export const BIN_ARRAY_INDEX = ACTIVE_ID / BIN_ARRAY_SIZE - 1;
export const MAX_BASIS_POINTS = 10_000;
export const FILTER_PERIOD = 30;
export const DECAY_PERIOD = 600;
export const REDUCTION_FACTOR = 5_000;
export const VARIABLE_FEE_CONTROL = 40_000;
export const MAX_VOLATILITY_ACCUMULATOR = 350_000;
export const PROTOCOL_SHARE = 2000;
export const START_TIME = 1000;
export const REWARDS_DURATION = 24 * 3600;
export const REWARDS_PER_SECOND = Math.floor(100e9 / REWARDS_DURATION);
export const VARIABLE_FEE_PRECISION = 100_000_000_000;
export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const ONE = 1 << SCALE_OFFSET;
export const PRECISION = 1_000_000_000;

export const UNIT_PRICE_DEFAULT = 100_000;
export const CCU_LIMIT = 400;
export const WRAP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
