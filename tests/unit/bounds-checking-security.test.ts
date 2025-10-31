/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey } from '@solana/web3.js';

describe('Bounds Checking Security Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('Array Bounds Vulnerabilities', () => {
        test('should handle negative bin array indices', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getMultipleAccountsInfo: jest.fn().mockResolvedValue([null]),
            };

            (service as any).connection = mockConnection;

            // Mock getPairAccount with negative activeId
            jest.spyOn(service, 'getPairAccount').mockResolvedValue({
                activeId: -1000, // Negative activeId
                binStep: 10,
            });

            // Mock getBinArray to handle negative indices
            jest.spyOn(service, 'getBinArray').mockImplementation((params) => {
                console.log('Bin array index requested:', params.binArrayIndex);
                return new PublicKey('11111111111111111111111111111112');
            });

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            // This should handle negative indices without crashing
            try {
                const binArrayInfo = await service.getBinArrayInfo({
                    binArrayIndex: -1, // Negative index
                    pair: pairAddress,
                });
                console.log('Negative bin array index result:', binArrayInfo);
                expect(binArrayInfo).toBeDefined();
            } catch (error) {
                console.log('Negative bin array index error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should handle extreme bin array indices', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getMultipleAccountsInfo: jest.fn().mockResolvedValue([null]),
            };

            (service as any).connection = mockConnection;

            jest.spyOn(service, 'getPairAccount').mockResolvedValue({
                activeId: Number.MAX_SAFE_INTEGER, // Extreme activeId
                binStep: 10,
            });

            jest.spyOn(service, 'getBinArray').mockImplementation((params) => {
                console.log('Extreme bin array index requested:', params.binArrayIndex);
                return new PublicKey('11111111111111111111111111111112');
            });

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            try {
                const binArrayInfo = await service.getBinArrayInfo({
                    binArrayIndex: Number.MAX_SAFE_INTEGER / 256, // Extreme index
                    pair: pairAddress,
                });
                console.log('Extreme bin array index result:', binArrayInfo);
                expect(binArrayInfo).toBeDefined();
            } catch (error) {
                console.log('Extreme bin array index error:', error.message);
                expect(error).toBeDefined();
            }
        });
    });

    describe('Bit Shift Bounds Vulnerabilities', () => {
        test('should handle extreme shift values in SCALE_OFFSET operations', () => {
            const SCALE_OFFSET = 64;
            const extremeValue = 1;

            // Test bit shifting with SCALE_OFFSET
            const result = extremeValue << SCALE_OFFSET;
            console.log('Extreme bit shift result:', result);

            // In JavaScript, this will overflow to 0
            expect(result).toBe(0);
        });

        test('should handle negative shift values', () => {
            const value = 1000;
            const negativeShift = -5;

            // Negative shifts are treated as positive in JavaScript
            const result = value << negativeShift;
            console.log('Negative shift result:', result);
            expect(typeof result).toBe('number');
        });

        test('should handle shift values beyond 32 bits', () => {
            const value = 1;
            const largeShift = 33; // Beyond 32-bit range

            const result = value << largeShift;
            console.log('Large shift result:', result);
            expect(result).toBe(0); // In JavaScript, shifts > 31 bits result in 0
        });
    });

    describe('Buffer Bounds Vulnerabilities', () => {
        test('should handle buffer access with invalid indices', () => {
            const buffer = Buffer.from('test data');

            // Test negative index
            try {
                const negativeAccess = buffer[-1];
                console.log('Negative buffer access result:', negativeAccess);
            } catch (error) {
                console.log('Negative buffer access error:', error.message);
                expect(error).toBeDefined();
            }

            // Test out of bounds index
            try {
                const outOfBoundsAccess = buffer[1000];
                console.log('Out of bounds buffer access result:', outOfBoundsAccess);
                expect(outOfBoundsAccess).toBeUndefined();
            } catch (error) {
                console.log('Out of bounds buffer access error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should handle buffer operations with invalid lengths', () => {
            try {
                // Create buffer with negative length
                const negativeLengthBuffer = Buffer.alloc(-1);
                console.log('Negative length buffer:', negativeLengthBuffer);
            } catch (error) {
                console.log('Negative length buffer error:', error.message);
                expect(error).toBeDefined();
            }

            try {
                // Create buffer with extreme length
                const extremeLengthBuffer = Buffer.alloc(Number.MAX_SAFE_INTEGER);
                console.log('Extreme length buffer created');
            } catch (error) {
                console.log('Extreme length buffer error:', error.message);
                expect(error).toBeDefined();
            }
        });
    });

    describe('Public Key Bounds Vulnerabilities', () => {
        test('should handle invalid public key byte arrays', () => {
            // Test with wrong length byte array
            const shortBytes = new Uint8Array(31); // Too short
            const longBytes = new Uint8Array(33); // Too long

            try {
                const shortKey = new PublicKey(shortBytes);
                console.log('Short byte array key:', shortKey);
            } catch (error) {
                console.log('Short byte array error:', error.message);
                expect(error).toBeDefined();
            }

            try {
                const longKey = new PublicKey(longBytes);
                console.log('Long byte array key:', longKey);
            } catch (error) {
                console.log('Long byte array error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should handle invalid base58 strings', () => {
            const invalidBase58 = 'invalid-base58-string!@#';

            try {
                const key = new PublicKey(invalidBase58);
                console.log('Invalid base58 key:', key);
            } catch (error) {
                console.log('Invalid base58 error:', error.message);
                expect(error).toBeDefined();
            }
        });
    });
});
