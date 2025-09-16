import { Commitment, ConnectionConfig } from '@solana/web3.js';

// Main config interface
export interface ILiquidityBookConfig {
  mode: MODE;
  options?: {
    rpcUrl: string;
    commitmentOrConfig?: Commitment | ConnectionConfig;
  };
}

// Enums
export enum MODE {
  TESTNET = 'testnet',
  DEVNET = 'devnet',
  MAINNET = 'mainnet',
}

export enum LiquidityShape {
  Spot = 'Spot',
  Curve = 'Curve',
  BidAsk = 'BidAsk',
}

export enum RemoveLiquidityType {
  All = 'All',
  BaseToken = 'BaseToken',
  QuoteToken = 'QuoteToken',
}
