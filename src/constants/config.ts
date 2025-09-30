export enum MODE {
  DEVNET = 'devnet',
  MAINNET = 'mainnet',
}

export enum LiquidityShape {
  /** Distributes liquidity uniformly across the selected price range */
  Spot = 'Spot',
  /** Distributes liquidity in a bell curve/gaussian distribution centered around active bin */
  Curve = 'Curve',
  /** Distributes liquidity with linear weighting - higher concentration on the edges */
  BidAsk = 'BidAsk',
}

export enum RemoveLiquidityType {
  All = 'All',
  TokenX = 'TokenX',
  TokenY = 'TokenY',
}
