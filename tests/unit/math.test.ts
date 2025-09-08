import { divRem, mulDiv, mulShr, shlDiv } from '../../utils/math';

describe('Math Utils', () => {
    describe('divRem', () => {
        test('should divide and return quotient and remainder', () => {
            const [quotient, remainder] = divRem(10, 3);
            expect(quotient).toBe(10 / 3); // 3.333...
            expect(remainder).toBe(1);
        });

        test('should handle exact division', () => {
            const [quotient, remainder] = divRem(10, 2);
            expect(quotient).toBe(5);
            expect(remainder).toBe(0);
        });

        test('should throw error for division by zero', () => {
            expect(() => divRem(10, 0)).toThrow('Division by zero');
        });

        test('should handle negative numbers', () => {
            const [quotient, remainder] = divRem(-10, 3);
            expect(quotient).toBe(-10 / 3); // -3.333...
            expect(remainder).toBe(-1);
        });
    });

    describe('mulDiv', () => {
        test('should multiply and divide with rounding up', () => {
            const result = mulDiv(10, 3, 4, 'up');
            expect(result).toBe(8); // Math.floor((10 * 3 + 4 - 1) / 4) = Math.floor(33/4) = 8
        });

        test('should multiply and divide with rounding down', () => {
            const result = mulDiv(10, 3, 4, 'down');
            expect(result).toBe(7.5); // (10 * 3) / 4 = 30 / 4 = 7.5
        });

        test('should handle exact multiplication and division', () => {
            const result = mulDiv(10, 2, 4, 'down');
            expect(result).toBe(5); // 20 / 4 = 5
        });
    });

    describe('mulShr', () => {
        test('should multiply and shift right with rounding up', () => {
            const result = mulShr(10, 3, 2, 'up'); // (10 * 3) / 4
            expect(result).toBe(8); // Math.floor((30 + 4 - 1) / 4) = 8
        });

        test('should multiply and shift right with rounding down', () => {
            const result = mulShr(10, 3, 2, 'down'); // (10 * 3) / 4
            expect(result).toBe(7.5); // 30 / 4 = 7.5
        });
    });

    describe('shlDiv', () => {
        test('should shift left and divide with rounding up', () => {
            const result = shlDiv(10, 3, 2, 'up'); // (10 << 2) / 3 = 40 / 3
            expect(result).toBe(14); // Math.floor((40 + 3 - 1) / 3) = Math.floor(42/3) = 14
        });

        test('should shift left and divide with rounding down', () => {
            const result = shlDiv(10, 3, 2, 'down'); // (10 << 2) / 3 = 40 / 3
            expect(result).toBe(40 / 3); // 13.333...
        });
    });
});
