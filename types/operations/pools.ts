import { PublicKey, Transaction } from "@solana/web3.js";

// Pool creation operations
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

// Bin array operations
export interface GetBinArrayParams {
  binArrayIndex: number;
  pair: PublicKey;
  payer?: PublicKey;
  transaction?: Transaction;
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

// Vault operations
export interface GetUserVaultInfoParams {
  tokenAddress: PublicKey;
  payer: PublicKey;
  transaction?: Transaction;
}

// User query operations
export interface UserPositionsParams {
  payer: PublicKey;
  pair: PublicKey;
}