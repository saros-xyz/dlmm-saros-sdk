import { PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export enum LiquidityShape {
  Spot = "Spot",
  Curve = "Curve",
  BidAsk = "BidAsk",
}

export enum RemoveLiquidityType {
  Both = "removeBoth",
  BaseToken = "removeBaseToken",
  QuoteToken = "removeQuoteToken",
}

export interface PositionInfo {
  pair: string;
  positionMint: string;
  position: string;

  liquidityShares: string[];
  lowerBinId: number;
  upperBinId: number;
  space: number[];
}

export interface GetBinArrayParams {
  binArrayIndex: number;
  pair: PublicKey;
  payer?: PublicKey;
  transaction?: Transaction;
}
export interface SwapParams {
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  amount: bigint;
  otherAmountOffset: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  pair: PublicKey;
  hook: PublicKey;
  payer: PublicKey;
}

export interface GetTokenOutputParams {
  pair: PublicKey;
  tokenBase: PublicKey;
  tokenQuote: PublicKey;
  amount: bigint;
  swapForY: boolean;
  isExactInput: boolean;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;
  slippage: number;
}

export interface GetTokenOutputResponse {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  amount: bigint;
  otherAmountOffset: bigint;
}

export interface Pair {
  bump: number[];
  liquidityBookConfig: string; // PublicKey as string
  binStep: number;
  binStepSeed: number[];
  tokenMintX: string; // PublicKey as string
  tokenMintY: string; // PublicKey as string
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
    timeLastUpdated: BN; // hex string, likely timestamp
    volatilityAccumulator: number;
    volatilityReference: number;
    idReference: number;
    space: [number, number, number, number];
  };
  protocolFeesX: string; // likely bytes/hex
  protocolFeesY: string; // likely bytes/hex
  hook: null | string; // hook could be nullable
}

interface Bin {
  totalSupply: string;
  reserveX: string;
  reserveY: string;
}

export interface CreatePairWithConfigParams {
  tokenBase: {
    decimal: number;
    mintAddress: string;
  };
  tokenQuote: {
    decimal: number;
    mintAddress: string;
  };
  binStep: number;
  ratePrice: number;
  payer: PublicKey;
}

export interface CreatePositionParams {
  payer: PublicKey;
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
  pair: PublicKey;
  binArrayIndex: number;
  positionMint: PublicKey;
  transaction: Transaction;
}

export interface GetUserVaultInfoParams {
  tokenAddress: PublicKey;
  payer: PublicKey;
  transaction?: Transaction;
}

export interface Distribution {
  relativeBinId: number;
  distributionX: number;
  distributionY: number;
}

export interface AddLiquidityIntoPositionParams {
  positionMint: PublicKey;
  payer: PublicKey;
  pair: PublicKey;
  transaction: Transaction;
  liquidityDistribution: Distribution[];
  amountY: number;
  amountX: number;
  binArrayLower: PublicKey;
  binArrayUpper: PublicKey;
}

export interface AddLiquidityParams {
  tokenX: {
    address?: string;
    decimals: number;
    amount: number;
    mintAddress: string;
  };
  tokenY: {
    address?: string;
    decimals: number;
    amount: number;
    mintAddress: string;
  };

  pair: string;
  binRange: [number, number];
  positions: PositionInfo[];
  shape: LiquidityShape;
  activeBin: number;
  refId: number;
  payer: PublicKey;
}

export interface RemoveMultipleLiquidityParams {
  maxPositionList: {
    position: string;
    start: number;
    end: number;
    positionMint: string;
  }[];
  payer: PublicKey;
  type: "removeBoth" | "removeBaseToken" | "removeQuoteToken";
  pair: PublicKey;
  tokenMintX: PublicKey;
  tokenMintY: PublicKey;
  activeId: number;
}

export interface RemoveMultipleLiquidityResponse {
  txs: Transaction[];
  txCreateAccount?: Transaction;
  txCloseAccount?: Transaction;
  positionClosed?: Record<string, string>[];
}

export interface GetBinsArrayInfoParams {
  binArrayIndex: number;
  pair: PublicKey;
  payer: PublicKey;
}

export interface GetBinsReserveParams {
  position: PublicKey;
  pair: PublicKey;
  payer: PublicKey;
}

export interface GetBinsReserveResponse {
  reserveX: string | number;
  reserveY: string | number;
  totalSupply: string | number;
  liquidityShare: BN;
  binId: number;
  binPosistion: number;
}

export interface ReserveParams {
  binId: number;
  reserveX: string | number;
  reserveY: string | number;
  liquidityShare: string | number;
}

export interface UserPositionsParams {
  payer: PublicKey;
  pair: PublicKey;
}
