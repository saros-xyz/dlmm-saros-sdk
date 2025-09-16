import { PublicKey, Transaction } from '@solana/web3.js';
import { PoolMetadata } from '../info';

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


// Quote operations
export interface QuoteParams {
  amount: number;
  metadata: PoolMetadata;
  optional: {
    isExactInput: boolean;
    swapForY: boolean;
    slippage: number;
  };
}
