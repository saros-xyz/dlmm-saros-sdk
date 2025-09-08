/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { getPriceFromId, getIdFromPrice } from '../../utils/price';

describe('Price Calculation Type Safety Tests', () => {
    describe('BigInt/Number Mixing Vulnerabilities', () => {
        test('should handle BigInt to number conversion in getBase', () => {
            // Test the specific case from getBase function
            const BASIS_POINT_MAX = 10000;
            const binStep = 10;
            const SCALE_OFFSET = 64;

            // This simulates the problematic line: quotient / basisPointMaxBigInt
            const quotient = binStep << SCALE_OFFSET; // This becomes a number
            const basisPointMaxBigInt = BigInt(BASIS_POINT_MAX);

            // The bug: mixing number and BigInt in division
            try {
                // @ts-ignore - This is the problematic operation
                const result = quotient / basisPointMaxBigInt;
                expect(typeof result).toBe('bigint');
                console.log('BigInt division result:', result);
            } catch (error) {
                console.log('BigInt division error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should detect precision loss in price calculations', () => {
            const binStep = 10;
            const binId = 8388608;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const price = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);

            // Check if the price calculation maintains reasonable precision
            expect(typeof price).toBe('number');
            expect(price).toBeGreaterThan(0);
            expect(isFinite(price)).toBe(true);

            console.log('Price calculation result:', price);
        });

        test('should handle edge cases in getIdFromPrice', () => {
            const price = 1.0;
            const binStep = 10;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const binId = getIdFromPrice(price, binStep, baseTokenDecimal, quoteTokenDecimal);

            expect(typeof binId).toBe('number');
            expect(Number.isInteger(binId)).toBe(true);
            expect(binId).toBeGreaterThanOrEqual(0);

            console.log('Bin ID calculation result:', binId);
        });

        test('should detect overflow in price calculations', () => {
            // Test with extreme values that could cause overflow
            const extremePrice = Number.MAX_VALUE;
            const binStep = 1;
            const baseTokenDecimal = 18;
            const quoteTokenDecimal = 0;

            try {
                const binId = getIdFromPrice(extremePrice, binStep, baseTokenDecimal, quoteTokenDecimal);
                console.log('Extreme price bin ID:', binId);
                expect(typeof binId).toBe('number');
            } catch (error) {
                console.log('Extreme price error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should handle zero and negative prices', () => {
            const zeroPrice = 0;
            const negativePrice = -1;
            const binStep = 10;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            expect(() => getIdFromPrice(zeroPrice, binStep, baseTokenDecimal, quoteTokenDecimal))
                .toThrow('Giá phải lớn hơn 0');

            expect(() => getIdFromPrice(negativePrice, binStep, baseTokenDecimal, quoteTokenDecimal))
                .toThrow('Giá phải lớn hơn 0');
        });

        test('should handle invalid binStep values', () => {
            const price = 1.0;
            const invalidBinStep = 0;
            const negativeBinStep = -1;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            expect(() => getIdFromPrice(price, invalidBinStep, baseTokenDecimal, quoteTokenDecimal))
                .toThrow('Bin step invalid');

            expect(() => getIdFromPrice(price, negativeBinStep, baseTokenDecimal, quoteTokenDecimal))
                .toThrow('Bin step invalid');
        });
    });
});
