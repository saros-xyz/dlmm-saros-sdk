// Explicit exports for the SDK
// New pair-centric architecture: SarosDLMM (static factory) + SarosDLMMPair (instance)

// Main SDK classes
export { SarosDLMM } from './services';
export { SarosDLMMPair } from './services/pair';

// Public enums (values)
export { MODE, LiquidityShape, RemoveLiquidityType } from './types';

export { getPriceFromId, getIdFromPrice } from './utils/price';
export { getTokenProgram, getPairVaultInfo, getUserVaultInfo } from './utils/vaults';

export type { GetPairVaultInfoParams, GetUserVaultInfoParams } from './utils/vaults';

export type { Distribution } from './utils/position/bin-distribution';

// Public types (type-only)
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
  GetPairLiquidityParams,
  PairMetadata,
  DLMMPairAccount,
  PositionAccount,
  PairLiquidityData,
  BinLiquidityData,
  GetMaxAmountOutWithFeeParams,
  GetMaxAmountOutWithFeeResponse,
  GetPositionBinBalancesParams,
  PositionBinBalance,
  GetBinArrayInfoParams,
  BinArray,
  Bin,
} from './types';
