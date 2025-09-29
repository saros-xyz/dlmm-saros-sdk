import { BN } from '@coral-xyz/anchor';
import { describe, expect, it } from 'vitest';
import { divRemBN, mulDivBN } from '../utils/math';

describe('Math Utils - Edge Cases', () => {
  describe('Error Handling', () => {
    it('should throw on division by zero', () => {
      expect(() => mulDivBN(new BN(100), new BN(50), new BN(0), 'down')).toThrow('Division by zero');
      expect(() => divRemBN(new BN(10), new BN(0))).toThrow('Division by zero');
    });

    it('should throw on invalid rounding mode', () => {
      expect(() =>
        // @ts-expect-error Testing invalid input
        mulDivBN(new BN(100), new BN(50), new BN(10), 'invalid')
      ).toThrow('Invalid rounding mode');
    });
  });

  describe('Rounding Behavior', () => {
    it('should handle fractional results correctly', () => {
      // 7 * 3 / 2 = 21 / 2 = 10.5
      const bnDown = mulDivBN(new BN(7), new BN(3), new BN(2), 'down');
      const bnUp = mulDivBN(new BN(7), new BN(3), new BN(2), 'up');
      expect(bnDown.toNumber()).toBe(10);
      expect(bnUp.toNumber()).toBe(11);
    });
  });

  describe('Large Number Precision', () => {
    it('should handle BN large number division correctly', () => {
      const [quotient, remainder] = divRemBN(new BN('999999999999999999'), new BN('123456789'));
      expect(quotient.toString()).toBe('8100000073');
      expect(remainder.toString()).toBe('87654402');
    });

    it('should preserve precision in token calculations', () => {
      // Realistic DeFi scenario: liquidityShare * totalReserve / totalSupply
      const liquidityShare = new BN('1000000000'); // 1 token (9 decimals)
      const totalReserve = new BN('5000000000000000000'); // 5000 tokens
      const totalSupply = new BN('10000000000000000000'); // 10000 tokens

      const result = mulDivBN(liquidityShare, totalReserve, totalSupply, 'down');
      expect(result.toString()).toBe('500000000'); // 0.5 tokens
    });

    it('should handle very small results (dust amounts)', () => {
      const liquidityShare = new BN('1'); // Smallest unit
      const totalReserve = new BN('1000000000');
      const totalSupply = new BN('999999999999999999');

      const result = mulDivBN(liquidityShare, totalReserve, totalSupply, 'down');
      expect(result.toNumber()).toBe(0); // Rounds down to 0
    });
  });
});
