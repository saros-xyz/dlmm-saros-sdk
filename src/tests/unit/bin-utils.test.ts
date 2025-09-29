import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { BIN_ARRAY_SIZE, ACTIVE_ID } from '../../constants';
import { BinArrays } from '../../utils/bin-arrays';

// Test constants
const MOCK_PAIR = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');
const MOCK_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

describe('BinArrays', () => {
  describe('calculateBinArrayIndex', () => {
    it('calculates correct index for bin ID within first array', () => {
      const binId = BIN_ARRAY_SIZE - 1;
      const result = BinArrays.calculateBinArrayIndex(binId);
      expect(result).toBe(0);
    });

    it('calculates correct index for bin ID in second array', () => {
      const binId = BIN_ARRAY_SIZE;
      const result = BinArrays.calculateBinArrayIndex(binId);
      expect(result).toBe(1);
    });

    it('calculates correct index for large bin ID', () => {
      const binId = BIN_ARRAY_SIZE * 5 + 100;
      const result = BinArrays.calculateBinArrayIndex(binId);
      expect(result).toBe(5);
    });
  });

  describe('calculateBinArrayRange', () => {
    it('returns single index for default range', () => {
      const activeId = ACTIVE_ID; // Center bin
      const result = BinArrays.calculateBinArrayRange(activeId);

      expect(result).toHaveLength(1);
      expect(result).toContain(BinArrays.calculateBinArrayIndex(activeId));
    });

    it('returns correct range for arrayRange = 3', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrays.calculateBinArrayRange(activeId, 3);

      expect(result).toHaveLength(3);

      const centerIndex = BinArrays.calculateBinArrayIndex(activeId);
      expect(result).toEqual([centerIndex - 1, centerIndex, centerIndex + 1]);
    });

    it('returns correct range for arrayRange = 5', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrays.calculateBinArrayRange(activeId, 5);

      expect(result).toHaveLength(5);

      const centerIndex = BinArrays.calculateBinArrayIndex(activeId);
      expect(result).toEqual([centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2]);
    });

    it('handles even arrayRange correctly', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrays.calculateBinArrayRange(activeId, 4);

      expect(result).toHaveLength(5);

      const centerIndex = BinArrays.calculateBinArrayIndex(activeId);
      expect(result).toEqual([centerIndex - 2, centerIndex - 1, centerIndex, centerIndex + 1, centerIndex + 2]);
    });
  });

  describe('getBinArrayAddress', () => {
    it('returns consistent address for same inputs', () => {
      const binArrayIndex = 5;

      const address1 = BinArrays.getBinArrayAddress(binArrayIndex, MOCK_PAIR, MOCK_PROGRAM_ID);
      const address2 = BinArrays.getBinArrayAddress(binArrayIndex, MOCK_PAIR, MOCK_PROGRAM_ID);

      expect(address1.toString()).toBe(address2.toString());
    });

    it('returns different addresses for different indices', () => {
      const address1 = BinArrays.getBinArrayAddress(1, MOCK_PAIR, MOCK_PROGRAM_ID);
      const address2 = BinArrays.getBinArrayAddress(2, MOCK_PAIR, MOCK_PROGRAM_ID);

      expect(address1.toString()).not.toBe(address2.toString());
    });

    it('returns different addresses for different pairs', () => {
      const anotherPair = new PublicKey('8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS');

      const address1 = BinArrays.getBinArrayAddress(1, MOCK_PAIR, MOCK_PROGRAM_ID);
      const address2 = BinArrays.getBinArrayAddress(1, anotherPair, MOCK_PROGRAM_ID);

      expect(address1.toString()).not.toBe(address2.toString());
    });
  });
});
