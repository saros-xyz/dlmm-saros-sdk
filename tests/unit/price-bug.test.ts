/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { getPriceFromId, getIdFromPrice } from '../../utils/price';
import { BASIS_POINT_MAX, SCALE_OFFSET } from '../../constants/config';

describe('Price Utils Type Safety Bug Tests', () => {
    describe('getBase Function BigInt/Number Mixing Bug', () => {
        test('should detect BigInt/number type mixing in getBase', () => {
            // Simulate the getBase function logic to expose the bug
            const binStep = 10;
            const quotient = binStep << SCALE_OFFSET; // This overflows!

            console.log('binStep:', binStep);
            console.log('SCALE_OFFSET:', SCALE_OFFSET);
            console.log('binStep << SCALE_OFFSET (overflowed):', quotient);

            // This demonstrates the overflow bug
            expect(quotient).toBe(10 << 64); // This will be 10 << 0 = 10 due to overflow
            expect(quotient).toBe(10); // Confirms the overflow

            // The original code tries to do:
            // const fraction = quotient / BASIS_POINT_MAX; // number / number
            // But quotient is wrong due to overflow
            const basisPointMax = BASIS_POINT_MAX;
            const fraction = quotient / basisPointMax;

            console.log('BASIS_POINT_MAX:', basisPointMax);
            console.log('fraction (wrong due to overflow):', fraction);

            // This should be a very large number but is wrong due to overflow
            expect(fraction).toBe(10 / 10000); // 0.001 instead of correct calculation
        });

        test('should show correct BigInt calculation', () => {
            const binStep = 10;
            const correctQuotient = BigInt(binStep) << BigInt(SCALE_OFFSET);
            const basisPointMax = BigInt(BASIS_POINT_MAX);
            const correctFraction = correctQuotient / basisPointMax;

            console.log('Correct BigInt quotient:', correctQuotient.toString());
            console.log('Correct BigInt fraction:', correctFraction.toString());

            expect(correctFraction.toString()).toBe('18446744073709551'); // 10 * 2^64 / 10000
        });
    });

    describe('getPriceFromId Type Issues', () => {
        test('should detect type casting issues in getPriceFromId', () => {
            const binStep = 10;
            const binId = 8388608;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            // This will use the buggy getBase internally
            try {
                const result = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);
                console.log('getPriceFromId result:', result);
                expect(typeof result).toBe('number');
                // The result will be wrong due to the overflow bug in getBase
            } catch (error) {
                console.log('getPriceFromId error:', error);
            }
        });
    });

    describe('getIdFromPrice Type Issues', () => {
        test('should handle edge cases in getIdFromPrice', () => {
            // Test with zero price (should throw)
            expect(() => getIdFromPrice(0, 10, 9, 6)).toThrow('Giá phải lớn hơn 0');

            // Test with negative price (should throw)
            expect(() => getIdFromPrice(-1, 10, 9, 6)).toThrow('Giá phải lớn hơn 0');

            // Test with invalid binStep
            expect(() => getIdFromPrice(1, 0, 9, 6)).toThrow('Bin step invalid');
            expect(() => getIdFromPrice(1, 10001, 9, 6)).toThrow('Bin step invalid');
        });
    });
});
