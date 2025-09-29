import { BinAccount, BinArrayAccount } from '../types';
import { BIN_ARRAY_SIZE } from '../constants';
import { DLMMError } from '../error';
import { Connection, PublicKey } from '@solana/web3.js';
import { deriveBinArrayPDA } from './pda';
export class BinArrayRange {
  private readonly bins: { [binId: number]: BinAccount };

  constructor(binArrays: BinArrayAccount[]) {
    if (binArrays.length === 0) {
      throw new DLMMError('No bin arrays provided', 'BIN_ARRAY_EMPTY');
    }

    // Enforce continuity if more than one is provided
    for (let i = 1; i < binArrays.length; i++) {
      if (binArrays[i].index !== binArrays[i - 1].index + 1) {
        throw new DLMMError('Bin array index mismatch', 'BIN_ARRAY_INDEX_MISMATCH');
      }
    }

    this.bins = {};
    binArrays.forEach((binArray) => {
      binArray.bins.forEach((bin, index) => {
        const binId = binArray.index * BIN_ARRAY_SIZE + index;
        this.bins[binId] = bin;
      });
    });
  }

  static async fromIndex(
    lbProgram: any,
    connection: Connection,
    pair: PublicKey,
    binArrayIndex: number
  ): Promise<BinArrayRange> {
    const indices = [binArrayIndex - 1, binArrayIndex, binArrayIndex + 1];

    const binArrays: BinArrayAccount[] = [];
    for (const idx of indices) {
      const pda = deriveBinArrayPDA(pair, idx, lbProgram.programId);
      const accInfo = await connection.getAccountInfo(pda);
      if (accInfo) {
        // @ts-ignore
        const acc = await lbProgram.account.binArray.fetch(pda);
        binArrays.push(acc);
      }
    }

    if (binArrays.length === 0) {
      throw new DLMMError(`No bin arrays found around index ${binArrayIndex}`, 'BIN_ARRAY_NOT_FOUND');
    }

    return new BinArrayRange(binArrays);
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
