import { BinAccount, BinArrayAccount } from '../types';
import { BIN_ARRAY_SIZE } from '../constants';
import { DLMMError } from '../error';

export class BinArrayRange {
  private readonly bins: { [binId: number]: BinAccount };

  constructor(prev: BinArrayAccount, current: BinArrayAccount, next: BinArrayAccount) {
    if (current.index !== prev.index + 1 || next.index !== current.index + 1) {
      throw new DLMMError('Bin array index mismatch', 'BIN_ARRAY_INDEX_MISMATCH');
    }

    this.bins = {};

    [prev, current, next].forEach((binArray) => {
      binArray.bins.forEach((bin, index) => {
        const binId = binArray.index * BIN_ARRAY_SIZE + index;
        this.bins[binId] = bin;
      });
    });
  }

  getBin(binId: number) {
    const bin = this.bins[binId];
    if (!bin) {
      throw new DLMMError(`Bin ${binId} not found in range`, 'BIN_NOT_FOUND');
    }
    return bin;
  }

  getAllBins() {
    return Object.values(this.bins);
  }
}
