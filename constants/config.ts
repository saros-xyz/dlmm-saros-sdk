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

export const UNIT_PRICE_DEFAULT = 1_000_000;
export const CCU_LIMIT = 400_000;
export const WRAP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
export const FIXED_LENGTH = 16;

export const BIN_STEP_CONFIGS = [
  {
    binStep: 1,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 10,
      decayPeriod: 120,
      reductionFactor: 5000,
      variableFeeControl: 2000000,
      maxVolatilityAccumulator: 100000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 2,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 10,
      decayPeriod: 120,
      reductionFactor: 5000,
      variableFeeControl: 500000,
      maxVolatilityAccumulator: 250000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 5,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 30,
      decayPeriod: 600,
      reductionFactor: 5000,
      variableFeeControl: 120000,
      maxVolatilityAccumulator: 300000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 10,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 30,
      decayPeriod: 600,
      reductionFactor: 5000,
      variableFeeControl: 40000,
      maxVolatilityAccumulator: 350000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 20,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 30,
      decayPeriod: 600,
      reductionFactor: 5000,
      variableFeeControl: 20000,
      maxVolatilityAccumulator: 350000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 50,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 120,
      decayPeriod: 1200,
      reductionFactor: 5000,
      variableFeeControl: 10000,
      maxVolatilityAccumulator: 250000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 100,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 300,
      decayPeriod: 1200,
      reductionFactor: 5000,
      variableFeeControl: 7500,
      maxVolatilityAccumulator: 150000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 200,
    feeParameters: {
      baseFactor: 10000,
      filterPeriod: 300,
      decayPeriod: 1200,
      reductionFactor: 5000,
      variableFeeControl: 7500,
      maxVolatilityAccumulator: 150000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
  {
    binStep: 250,
    feeParameters: {
      baseFactor: 20000,
      filterPeriod: 300,
      decayPeriod: 1200,
      reductionFactor: 5000,
      variableFeeControl: 7500,
      maxVolatilityAccumulator: 150000,
      protocolShare: 2000,
      space: [0, 0],
    },
  },
];
