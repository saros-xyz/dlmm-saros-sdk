import { Bin, BinArray } from '../types';
import { BIN_ARRAY_SIZE } from '../constants';
import { SarosDLMMError } from './errors';

export class BinArrayRange {
  private readonly bins: { [binId: number]: Bin };

  constructor(binArrayPrevious: BinArray, binArrayCurrent: BinArray, binArrayNext: BinArray) {
    if (
      binArrayCurrent.index !== binArrayPrevious.index + 1 ||
      binArrayNext.index !== binArrayCurrent.index + 1
    ) {
      throw SarosDLMMError.BinArrayIndexMismatch;
    }

    this.bins = {};

    const addBins = (binArray: BinArray) => {
      binArray.bins.forEach((bin, index) => {
        const binId = binArray.index * BIN_ARRAY_SIZE + index;
        this.bins[binId] = bin;
      });
    };

    addBins(binArrayPrevious);
    addBins(binArrayCurrent);
    addBins(binArrayNext);
  }

  getBinMut(binId: number) {
    return this.bins[binId];
  }

  getAllBins() {
    return Object.values(this.bins);
  }
}
