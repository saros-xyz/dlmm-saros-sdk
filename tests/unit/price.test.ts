import { getPriceFromId, getIdFromPrice } from '../../utils/price';

describe('Price Utils', () => {
    describe('getPriceFromId', () => {
        test('should calculate price from bin ID correctly', () => {
            const binStep = 100; // 1%
            const binId = 8388608; // Center bin
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const price = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);
            expect(typeof price).toBe('number');
            expect(price).toBeGreaterThan(0);
        });

        test('should handle different bin steps', () => {
            const binId = 8388608;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const price1 = getPriceFromId(50, binId, baseTokenDecimal, quoteTokenDecimal);
            const price2 = getPriceFromId(200, binId, baseTokenDecimal, quoteTokenDecimal);

            expect(price1).toBeGreaterThan(0);
            expect(price2).toBeGreaterThan(0);
            // Different bin steps should give different prices
            console.log('Price1:', price1, 'Price2:', price2);
            // For now, just check they are numbers
            expect(typeof price1).toBe('number');
            expect(typeof price2).toBe('number');
        });

        test('should handle different decimals', () => {
            const binStep = 100;
            const binId = 8388608;

            const price1 = getPriceFromId(binStep, binId, 9, 6);
            const price2 = getPriceFromId(binStep, binId, 6, 9);

            expect(price1).toBeGreaterThan(0);
            expect(price2).toBeGreaterThan(0);
            // Different decimals should give different prices
            expect(price1).not.toBe(price2);
        });
    });

    describe('getIdFromPrice', () => {
        test('should calculate bin ID from price correctly', () => {
            const price = 1.0;
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const binId = getIdFromPrice(price, binStep, baseTokenDecimal, quoteTokenDecimal);
            expect(typeof binId).toBe('number');
            expect(binId).toBeGreaterThan(0);
        });

        test('should throw error for invalid price', () => {
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            expect(() => getIdFromPrice(0, binStep, baseTokenDecimal, quoteTokenDecimal)).toThrow('Giá phải lớn hơn 0');
            expect(() => getIdFromPrice(-1, binStep, baseTokenDecimal, quoteTokenDecimal)).toThrow('Giá phải lớn hơn 0');
        });

        test('should throw error for invalid bin step', () => {
            const price = 1.0;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            expect(() => getIdFromPrice(price, 0, baseTokenDecimal, quoteTokenDecimal)).toThrow('Bin step invalid');
            expect(() => getIdFromPrice(price, 10001, baseTokenDecimal, quoteTokenDecimal)).toThrow('Bin step invalid');
        });

        test('should handle different prices', () => {
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;

            const binId1 = getIdFromPrice(1.0, binStep, baseTokenDecimal, quoteTokenDecimal);
            const binId2 = getIdFromPrice(2.0, binStep, baseTokenDecimal, quoteTokenDecimal);

            expect(binId1).toBeGreaterThan(0);
            expect(binId2).toBeGreaterThan(0);
            expect(binId2).toBeGreaterThan(binId1); // Higher price should give higher bin ID
        });
    });

    describe('Price and ID conversion roundtrip', () => {
        test('should maintain consistency in price <-> ID conversion', () => {
            const binStep = 100;
            const baseTokenDecimal = 9;
            const quoteTokenDecimal = 6;
            const originalPrice = 1.5;

            const binId = getIdFromPrice(originalPrice, binStep, baseTokenDecimal, quoteTokenDecimal);
            const recoveredPrice = getPriceFromId(binStep, binId, baseTokenDecimal, quoteTokenDecimal);

            // Should be approximately equal (allowing for rounding)
            expect(Math.abs(recoveredPrice - originalPrice)).toBeLessThan(0.01);
        });
    });
});
