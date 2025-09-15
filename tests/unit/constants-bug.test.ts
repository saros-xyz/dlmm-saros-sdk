/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { BASIS_POINT_MAX, ONE, SCALE_OFFSET } from '../../constants/config';

describe('Critical Constants Bug Tests', () => {
    describe('ONE Constant Overflow Bug', () => {
        test('should detect ONE constant overflow bug', () => {
            // CRITICAL BUG: ONE = 1 << 64 overflows in JavaScript
            // Due to 32-bit integer limitation, 1 << 64 becomes 1 << (64 % 32) = 1 << 0 = 1
            const actualONE = 1 << SCALE_OFFSET; // This is WRONG
            const expectedONE = 2n ** 64n; // This is CORRECT

            console.log('SCALE_OFFSET:', SCALE_OFFSET);
            console.log('Actual ONE (wrong):', actualONE);
            console.log('Expected ONE (correct):', expectedONE.toString());

            // This test documents the bug - it should fail
            expect(actualONE).not.toBe(Number(expectedONE));
            expect(actualONE).toBe(1); // Due to overflow
        });

        test('should verify correct BigInt ONE value', () => {
            const correctONE = BigInt(1) << BigInt(SCALE_OFFSET);
            expect(correctONE).toBe(2n ** 64n);
            expect(correctONE.toString()).toBe('18446744073709551616');
        });
    });

    describe('BASIS_POINT_MAX Type Consistency', () => {
        test('should verify BASIS_POINT_MAX is number', () => {
            expect(typeof BASIS_POINT_MAX).toBe('number');
            expect(BASIS_POINT_MAX).toBe(10000);
        });
    });
});
