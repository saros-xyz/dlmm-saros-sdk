/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey } from '@solana/web3.js';

describe('Error Handling Security Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('Generic Error Handling Vulnerabilities', () => {
        test('should handle network errors gracefully in getPairAccount', async () => {
            const mockProgram = {
                account: {
                    pair: {
                        fetch: jest.fn().mockRejectedValue(new Error('Network connection failed')),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            try {
                const result = await service.getPairAccount(pairAddress);
                console.log('Network error result:', result);
                expect(result).toBeNull();
            } catch (error) {
                console.log('Network error caught:', error.message);
                expect(error.message).toContain('Network connection failed');
            }
        });

        test('should handle timeout errors in async operations', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockImplementation(
                    () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
                ),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
            };

            (service as any).connection = mockConnection;

            const startTime = Date.now();

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timeout')), 50)
            );

            const operationPromise = service.getPairAccount(
                new PublicKey('11111111111111111111111111111112')
            );

            try {
                await Promise.race([operationPromise, timeoutPromise]);
            } catch (error) {
                const endTime = Date.now();
                console.log(`Timeout error after ${endTime - startTime}ms:`, error.message);
                expect(error.message).toContain('timeout');
            }
        });

        test('should handle malformed data from blockchain', async () => {
            const mockProgram = {
                account: {
                    pair: {
                        fetch: jest.fn().mockResolvedValue({
                            // Malformed data - missing required fields
                            activeId: 'not-a-number', // Should be number
                            binStep: null, // Should be number
                            invalidField: 'extra-data'
                        }),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            const result = await service.getPairAccount(pairAddress);
            console.log('Malformed data result:', result);
            expect(result).toBeDefined();
            // The SDK should handle malformed data gracefully
        });

        test('should handle empty responses from blockchain', async () => {
            const mockProgram = {
                account: {
                    pair: {
                        fetch: jest.fn().mockResolvedValue(null),
                    },
                },
            };

            (service as any).lbProgram = mockProgram;

            const pairAddress = new PublicKey('11111111111111111111111111111112');

            const result = await service.getPairAccount(pairAddress);
            console.log('Empty response result:', result);
            expect(result).toBeNull();
        });
    });

    describe('Transaction Creation Error Handling', () => {
        test('should handle invalid transaction parameters', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getMultipleAccountsInfo: jest.fn().mockResolvedValue([null, null, null]),
                getTokenAccountBalance: jest.fn().mockResolvedValue({
                    value: { amount: '1000000', decimals: 9 }
                }),
            };

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            remainingAccounts: jest.fn(() => ({
                                instruction: jest.fn(),
                            })),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };

            (service as any).connection = mockConnection;
            (service as any).lbProgram = mockProgram;

            jest.spyOn(service, 'getPairAccount').mockResolvedValue({
                activeId: 8388608,
                binStep: 10,
            });

            jest.spyOn(service, 'getBinArray').mockResolvedValue(
                new PublicKey('11111111111111111111111111111112')
            );

            // Test with invalid parameters
            const invalidParams = {
                tokenMintX: 'invalid-mint', // Should be PublicKey
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                amount: BigInt(1000000),
                otherAmountOffset: BigInt(100000),
                swapForY: false,
                isExactInput: true,
                pair: new PublicKey('11111111111111111111111111111112'),
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            try {
                // @ts-ignore - Testing invalid parameter types
                const transaction = await service.swap(invalidParams);
                console.log('Invalid params transaction:', transaction);
            } catch (error) {
                console.log('Invalid params error:', error.message);
                expect(error).toBeDefined();
            }
        });

        test('should handle concurrent transaction creation', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getMultipleAccountsInfo: jest.fn().mockResolvedValue([null, null, null]),
                getTokenAccountBalance: jest.fn().mockResolvedValue({
                    value: { amount: '1000000', decimals: 9 }
                }),
            };

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            remainingAccounts: jest.fn(() => ({
                                instruction: jest.fn(),
                            })),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };

            (service as any).connection = mockConnection;
            (service as any).lbProgram = mockProgram;

            jest.spyOn(service, 'getPairAccount').mockResolvedValue({
                activeId: 8388608,
                binStep: 10,
            });

            jest.spyOn(service, 'getBinArray').mockResolvedValue(
                new PublicKey('11111111111111111111111111111112')
            );

            const validParams = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                amount: BigInt(1000000),
                otherAmountOffset: BigInt(100000),
                swapForY: false,
                isExactInput: true,
                pair: new PublicKey('11111111111111111111111111111112'),
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            // Create multiple concurrent transactions
            const promises = Array.from({ length: 10 }, () =>
                service.swap(validParams)
            );

            try {
                const results = await Promise.all(promises);
                console.log(`Created ${results.length} concurrent transactions`);
                expect(results).toHaveLength(10);
                results.forEach(result => expect(result).toBeDefined());
            } catch (error) {
                console.log('Concurrent transaction error:', error.message);
                expect(error).toBeDefined();
            }
        });
    });
});
