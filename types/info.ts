export interface PoolMetadata {
  poolAddress: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  tradeFee: number;
  extra: {
    hook?: string;
  };
}

export interface TokenInfo {
    mintAddress: string;
    decimals: number;
    reserve: string;
    // TODO: consider adding quote price to response
    // currentPrice?: string 
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

export interface BinReserveInfo {
  reserveX: bigint;
  reserveY: bigint;
  totalSupply: bigint;
  liquidityShare: bigint;
  binId: number;
  binPosition: number;
}