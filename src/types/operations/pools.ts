import { PublicKey } from '@solana/web3.js';

// Pool creation operations
// TODO: rename to 'CreatePoolParams'
export interface CreatePoolParams {
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
// these 2 currently unused
// export interface GetBinArrayParams {
//   binArrayIndex: number;
//   pair: PublicKey;
//   payer?: PublicKey;
//   transaction?: Transaction;
// }

// export interface GetBinsArrayInfoParams {
//   binArrayIndex: number;
//   pair: PublicKey;
//   payer: PublicKey;
// }
