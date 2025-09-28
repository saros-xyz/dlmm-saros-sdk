import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { BIN_ARRAY_SIZE, ACTIVE_ID } from '../../constants';
import { BinArrayManager } from '../../utils/bin-manager';

// Test constants
const MOCK_PAIR = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');
const MOCK_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

describe('BinArrayManager', () => {
  describe('calculateBinArrayIndex', () => {
    it('calculates correct index for bin ID within first array', () => {
      const binId = BIN_ARRAY_SIZE - 1;
      const result = BinArrayManager.calculateBinArrayIndex(binId);
      expect(result).toBe(0);
    });

    it('calculates correct index for bin ID in second array', () => {
      const binId = BIN_ARRAY_SIZE;
      const result = BinArrayManager.calculateBinArrayIndex(binId);
      expect(result).toBe(1);
    });

    it('calculates correct index for large bin ID', () => {
      const binId = BIN_ARRAY_SIZE * 5 + 100;
      const result = BinArrayManager.calculateBinArrayIndex(binId);
      expect(result).toBe(5);
    });
  });

  describe('calculateBinArrayRange', () => {
    it('returns single index for default range', () => {
      const activeId = ACTIVE_ID; // Center bin
      const result = BinArrayManager.calculateBinArrayRange(activeId);

      expect(result).toHaveLength(1);
      expect(result).toContain(BinArrayManager.calculateBinArrayIndex(activeId));
    });

    it('returns correct range for arrayRange = 3', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrayManager.calculateBinArrayRange(activeId, 3);

      expect(result).toHaveLength(3);

      const centerIndex = BinArrayManager.calculateBinArrayIndex(activeId);
      expect(result).toEqual([centerIndex - 1, centerIndex, centerIndex + 1]);
    });

    it('returns correct range for arrayRange = 5', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrayManager.calculateBinArrayRange(activeId, 5);

      expect(result).toHaveLength(5);

      const centerIndex = BinArrayManager.calculateBinArrayIndex(activeId);
      expect(result).toEqual([
        centerIndex - 2,
        centerIndex - 1,
        centerIndex,
        centerIndex + 1,
        centerIndex + 2,
      ]);
    });

    it('handles even arrayRange correctly', () => {
      const activeId = ACTIVE_ID;
      const result = BinArrayManager.calculateBinArrayRange(activeId, 4);

      expect(result).toHaveLength(5);

      const centerIndex = BinArrayManager.calculateBinArrayIndex(activeId);
      expect(result).toEqual([
        centerIndex - 2,
        centerIndex - 1,
        centerIndex,
        centerIndex + 1,
        centerIndex + 2,
      ]);
    });
  });

  describe('getBinArrayAddress', () => {
    it('returns consistent address for same inputs', () => {
      const binArrayIndex = 5;

      const address1 = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        MOCK_PAIR,
        MOCK_PROGRAM_ID
      );
      const address2 = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        MOCK_PAIR,
        MOCK_PROGRAM_ID
      );

      expect(address1.toString()).toBe(address2.toString());
    });

    it('returns different addresses for different indices', () => {
      const address1 = BinArrayManager.getBinArrayAddress(1, MOCK_PAIR, MOCK_PROGRAM_ID);
      const address2 = BinArrayManager.getBinArrayAddress(2, MOCK_PAIR, MOCK_PROGRAM_ID);

      expect(address1.toString()).not.toBe(address2.toString());
    });

    it('returns different addresses for different pairs', () => {
      const anotherPair = new PublicKey('8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS');

      const address1 = BinArrayManager.getBinArrayAddress(1, MOCK_PAIR, MOCK_PROGRAM_ID);
      const address2 = BinArrayManager.getBinArrayAddress(1, anotherPair, MOCK_PROGRAM_ID);

      expect(address1.toString()).not.toBe(address2.toString());
    });
  });
});
