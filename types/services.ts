import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export interface GetBinArrayParams {
  binArrayIndex: number;
  pair: PublicKey;
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

export interface BinArray {
  index: number;
  pair: PublicKey;
  bins: Bin[];
  space: number[];
}
