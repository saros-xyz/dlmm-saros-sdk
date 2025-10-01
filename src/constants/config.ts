/**
 * Supported network modes (devnet, mainet)
 */
export enum MODE {
  DEVNET = 'devnet',
  MAINNET = 'mainnet',
}

/**
 * Shapes for distributing liquidity across a price range:
 * - Spot: uniform distribution
 * - Curve: bell curve centered on active bin
 * - BidAsk: linear weighting toward edges
 */
export enum LiquidityShape {
  Spot = 'Spot',
  Curve = 'Curve',
  BidAsk = 'BidAsk',
}

/**
 * Options for removing liquidity:
 * - All: withdraw all liquidity
 * - TokenX: withdraw only Token X
 * - TokenY: withdraw only Token Y
 */
export enum RemoveLiquidityType {
  All = 'All',
  TokenX = 'TokenX',
  TokenY = 'TokenY',
}
