export interface Bin {
  reserveX: bigint;
  reserveY: bigint;
  totalSupply: bigint;
}

export interface BinArray {
  bins: Bin[];
  index: number;
}
