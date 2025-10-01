// Explicit exports for the SDK
// New pair-centric architecture: SarosDLMM (static factory) + SarosDLMMPair (instance)

// Main SDK classes
export { SarosDLMM } from './services';
export { SarosDLMMPair } from './services/pair';

// Program IDs
export { DLMM_PROGRAM_IDS } from './constants';

// Public enums (values)
export { MODE, LiquidityShape, RemoveLiquidityType } from './constants';

// helpers
export { getPriceFromId, getIdFromPrice } from './utils/price';
export { getFeeMetadata } from './utils/fees';

// reenable if we want to support legacy 'addLiquidityToPosition'
// export type { Distribution, createUniformDistribution } from './utils/bin-distribution';

// Public types
export type {
  SwapParams,
  SwapOptions,
  QuoteParams,
  QuoteResponse,
  CreatePositionParams,
  AddLiquidityByShapeParams,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
  GetUserPositionsParams,
  CreatePairParams,
  CreatePairResponse,
  PairMetadata,
  DLMMPairAccount,
  PositionAccount,
  GetMaxAmountOutWithFeeParams,
  GetMaxAmountOutWithFeeResponse,
  GetPositionReservesParams,
  PositionReserve,
  GetBinArrayReservesParams,
  BinArray,
  Bin,
} from './types';
