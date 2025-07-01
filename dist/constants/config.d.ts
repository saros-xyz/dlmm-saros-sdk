export declare const CONFIG: {
    testnet: {
        rpc: string;
    };
    devnet: {
        rpc: string;
    };
    mainnet: {
        rpc: string;
    };
};
export declare const BASE_FACTOR = 8000;
export declare const BIN_STEP = 1;
export declare const ACTIVE_ID = 8388608;
export declare const BIN_ARRAY_SIZE = 256;
export declare const BIN_ARRAY_INDEX: number;
export declare const MAX_BASIS_POINTS = 10000;
export declare const FILTER_PERIOD = 30;
export declare const DECAY_PERIOD = 600;
export declare const REDUCTION_FACTOR = 5000;
export declare const VARIABLE_FEE_CONTROL = 40000;
export declare const MAX_VOLATILITY_ACCUMULATOR = 350000;
export declare const PROTOCOL_SHARE = 2000;
export declare const START_TIME = 1000;
export declare const REWARDS_DURATION: number;
export declare const REWARDS_PER_SECOND: number;
export declare const VARIABLE_FEE_PRECISION = 100000000000;
export declare const SCALE_OFFSET = 64;
export declare const BASIS_POINT_MAX = 10000;
export declare const ONE: number;
export declare const PRECISION = 1000000000;
export declare const UNIT_PRICE_DEFAULT = 1000000;
export declare const CCU_LIMIT = 400000;
export declare const WRAP_SOL_ADDRESS = "So11111111111111111111111111111111111111112";
export declare const FIXED_LENGTH = 16;
export declare const BIN_STEP_CONFIGS: {
    binStep: number;
    feeParameters: {
        baseFactor: number;
        filterPeriod: number;
        decayPeriod: number;
        reductionFactor: number;
        variableFeeControl: number;
        maxVolatilityAccumulator: number;
        protocolShare: number;
        space: number[];
    };
}[];
