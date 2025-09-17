import { PublicKey } from '@solana/web3.js';

export interface Bin {
  reserveX: bigint;
  reserveY: bigint;
  totalSupply: bigint;
}

export interface BinArray {
  bins: Bin[];
  index: number;
}

export interface GetBinsReserveParams {
  position: PublicKey;
  pair: PublicKey;
  payer: PublicKey;
}
