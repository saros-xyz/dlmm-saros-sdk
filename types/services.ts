import { PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export enum LiquidityShape {
  Spot = "Spot",
  Curve = "Curve",
  BidAsk = "BidAsk",
}

export enum RemoveLiquidityType {
  All = "All",
  BaseToken = "BaseToken",
  QuoteToken = "QuoteToken",
}

export interface PositionInfo {
  positionMint: PublicKey;
  position: PublicKey;

  liquidityShares: BN[];
  lowerBinId: number;
  upperBinId: number;
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
  liquidityBookConfig: PublicKey; // PublicKey as string
  binStep: number;
  binStepSeed: number[];
  tokenMintX: PublicKey; // PublicKey as string
  tokenMintY: PublicKey; // PublicKey as string
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
  protocolFeesX: BN; // likely bytes/hex
  protocolFeesY: BN; // likely bytes/hex
  hook: null | string; // hook could be nullable
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

export interface RemoveMultipleLiquidityParams {
  maxPositionList: {
    position: string;
    start: number;
    end: number;
    positionMint: string;
  }[];
  payer: PublicKey;
  type: RemoveLiquidityType;
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

export interface UserPositionsParams {
  payer: PublicKey;
  pair: PublicKey;
}

export interface PositionAccount {
  liquidityShares: BN[];
  lowerBinId: number;
  pair: PublicKey;
  positionMint: PublicKey;
  space: number[];
  upperBinId: number;
}
