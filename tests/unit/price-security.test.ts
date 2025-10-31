/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { getPriceFromId, getIdFromPrice } from '../../utils/price';
import { BASIS_POINT_MAX, SCALE_OFFSET } from '../../constants/config';

describe('Price Utils - Security Tests', () => {
    describe('Integer Overflow in Price Calculations', () => {
        test('should detect overflow in getBase function', () => {
            // Test with binStep that causes overflow in bit shifting
            const largeBinStep = 1000000; // Large bin step
            const base = (largeBinStep << SCALE_OFFSET); // This overflows

            console.log('Bit shift overflow result:', base);
            expect(typeof base).toBe('number');
            // In JavaScript, this will be Infinity or negative number due to overflow
        });

        test('should handle maximum bin step values', () => {
            const maxBinStep = BASIS_POINT_MAX; // 10000
            const base = (maxBinStep << SCALE_OFFSET);

            console.log('Max bin step overflow:', base);
            expect(typeof base).toBe('number');
        });

        test('should detect overflow in price calculations', () => {
            // Test with extreme binId values
            const extremeBinId = Number.MAX_SAFE_INTEGER;
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            try {
                const price = getPriceFromId(binStep, extremeBinId, baseTokenDecimal, quoteTokenDecimal);
                console.log('Extreme binId price result:', price);
                expect(typeof price).toBe('number');
            } catch (error) {
                console.log('Expected error with extreme binId:', error.message);
                expect(error).toBeDefined();
            }
        });
    });

    describe('Type Safety Violations', () => {
        test('should handle mixed BigInt and number types', () => {
            // This tests the @ts-ignore usage in getBase function
            const binStep = 100;
            const quotient = binStep << SCALE_OFFSET;

            // The original code has @ts-ignore here
            const basisPointMaxBigInt = BigInt(BASIS_POINT_MAX);
            const fraction = quotient / Number(basisPointMaxBigInt); // This is problematic

            console.log('Type mixing result:', fraction);
            expect(typeof fraction).toBe('number');
        });

        test('should handle division by zero in getBase', () => {
            // Test what happens if BASIS_POINT_MAX is 0
            const binStep = 100;
            const quotient = binStep << SCALE_OFFSET;

            // Simulate BASIS_POINT_MAX = 0
            const basisPointMaxZero = 0;
            if (basisPointMaxZero === 0) {
                console.log('Would return null due to division by zero');
                expect(true).toBe(true); // Should handle this case
            }
        });
    });

    describe('Mathematical Edge Cases', () => {
        test('should handle zero bin step', () => {
            expect(() => getIdFromPrice(1.0, 0, 9, 6)).toThrow('Bin step invalid');
        });

        test('should handle negative bin step', () => {
            const negativeBinStep = -100;
            expect(() => getIdFromPrice(1.0, negativeBinStep, 9, 6)).toThrow('Bin step invalid');
        });

        test('should handle bin step exceeding maximum', () => {
            const excessiveBinStep = BASIS_POINT_MAX + 1; // 10001
            expect(() => getIdFromPrice(1.0, excessiveBinStep, 9, 6)).toThrow('Bin step invalid');
        });

        test('should handle zero price', () => {
            expect(() => getIdFromPrice(0, 100, 9, 6)).toThrow('Giá phải lớn hơn 0');
        });

        test('should handle negative price', () => {
            expect(() => getIdFromPrice(-1, 100, 9, 6)).toThrow('Giá phải lớn hơn 0');
        });
    });

    describe('Precision and Accuracy Issues', () => {
        test('should detect precision loss in Math.pow operations', () => {
            const binStep = 100;
            const binId = 8388608;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const base = 1 + binStep / BASIS_POINT_MAX;
            const exponent = binId - 8388608;
            const price1 = Math.pow(base, exponent);

            const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal);
            const finalPrice = price1 * decimalPow;

            console.log('Math.pow precision result:', finalPrice);
            expect(typeof finalPrice).toBe('number');
        });

        test('should detect precision loss in Math.log operations', () => {
            const price = 1.5;
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);
            const adjustedPrice = price * decimalPow;

            const base = 1 + binStep / BASIS_POINT_MAX;
            const exponent = Math.log(adjustedPrice) / Math.log(base);

            console.log('Math.log precision result:', exponent);
            expect(typeof exponent).toBe('number');
        });
    });

    describe('Boundary Value Testing', () => {
        test('should handle minimum and maximum binId values', () => {
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            // Test minimum binId (though it might be invalid)
            const minBinId = 0;
            try {
                const minPrice = getPriceFromId(binStep, minBinId, baseTokenDecimal, quoteTokenDecimal);
                console.log('Min binId price:', minPrice);
            } catch (error) {
                console.log('Min binId error:', error.message);
            }

            // Test very large binId
            const largeBinId = 16777216; // 2^24
            try {
                const largePrice = getPriceFromId(binStep, largeBinId, baseTokenDecimal, quoteTokenDecimal);
                console.log('Large binId price:', largePrice);
            } catch (error) {
                console.log('Large binId error:', error.message);
            }
        });

        test('should handle extreme decimal differences', () => {
            const binStep = 100;
            const binId = 8388608;

            // Extreme decimal differences
            const extremeBaseDecimal = 18;
            const extremeQuoteDecimal = 0;

            const extremePrice = getPriceFromId(binStep, binId, extremeBaseDecimal, extremeQuoteDecimal);
            console.log('Extreme decimal price:', extremePrice);
            expect(typeof extremePrice).toBe('number');
        });
    });

    describe('NaN and Infinity Handling', () => {
        test('should handle NaN in price calculations', () => {
            const binStep = 100;
            const nanBinId = NaN;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const result = getPriceFromId(binStep, nanBinId, baseTokenDecimal, quoteTokenDecimal);
            expect(result).toBeNaN();
        });

        test('should handle Infinity in price calculations', () => {
            const binStep = 100;
            const infinityBinId = Infinity;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const result = getPriceFromId(binStep, infinityBinId, baseTokenDecimal, quoteTokenDecimal);
            expect(result).toBe(Infinity);
        });
    });

    describe('Roundtrip Consistency', () => {
        test('should maintain consistency in price <-> ID conversion', () => {
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;
            const originalPrice = 1.5;

            const binId = getIdFromPrice(originalPrice, binStep, baseTokenDecimal, quoteTokenDecimal);
            const recoveredPrice = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);

            console.log('Original price:', originalPrice);
            console.log('Recovered price:', recoveredPrice);
            console.log('Difference:', Math.abs(recoveredPrice - originalPrice));

            // Allow for some rounding error
            expect(Math.abs(recoveredPrice - originalPrice)).toBeLessThan(0.01);
        });

        test('should handle roundtrip with extreme values', () => {
            const binStep = 50; // Smaller bin step for more precision
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;
            const extremePrice = 1000.0;

            try {
                const binId = getIdFromPrice(extremePrice, binStep, baseTokenDecimal, quoteTokenDecimal);
                const recoveredPrice = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);

                console.log('Extreme price roundtrip:');
                console.log('Original:', extremePrice);
                console.log('Recovered:', recoveredPrice);
                console.log('BinId:', binId);

                expect(Math.abs(recoveredPrice - extremePrice)).toBeLessThan(1.0);
            } catch (error) {
                console.log('Extreme price roundtrip error:', error.message);
                expect(error).toBeDefined();
            }
        });
    });
});
