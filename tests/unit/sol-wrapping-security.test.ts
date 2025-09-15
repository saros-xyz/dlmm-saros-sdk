/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey, SystemProgram } from '@solana/web3.js';

describe('SOL Wrapping Security Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('SOL Balance Validation Bypass', () => {
        test('should not validate SOL balance before wrapping', async () => {
            // Mock connection with insufficient balance
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getTokenAccountBalance: jest.fn().mockResolvedValue({
                    value: { amount: '1000000', decimals: 9, uiAmountString: '1' }
                }),
            };

            // Override the connection
            (service as any).connection = mockConnection;

            // Mock pair account
            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
                activeId: 8388608,
                binStep: 10,
            };

            // Mock the getPairAccount method
            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            // Mock program methods
            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            // Test swap with large amount (more than available SOL)
            const largeAmount = BigInt('1000000000000000'); // 1M SOL in lamports

            const params = {
                tokenMintX: mockPairInfo.tokenMintX,
                tokenMintY: mockPairInfo.tokenMintY,
                amount: largeAmount,
                otherAmountOffset: BigInt(1000000),
                swapForY: false, // SOL to USDC
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            // This should create a transaction even with insufficient balance
            const transaction = await service.swap(params);

            expect(transaction).toBeDefined();
            console.log('Transaction created despite insufficient balance');

            // Check if SystemProgram.transfer was called with large amount
            // In the current implementation, this happens without balance validation
        });

        test('should handle zero SOL balance', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
                getBalance: jest.fn().mockResolvedValue(0), // Zero balance
            };

            (service as any).connection = mockConnection;

            // Similar test setup as above
            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
                binStep: 10,
            };

            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            const params = {
                tokenMintX: mockPairInfo.tokenMintX,
                tokenMintY: mockPairInfo.tokenMintY,
                amount: BigInt('1000000'), // 0.001 SOL
                otherAmountOffset: BigInt(1000000),
                swapForY: false,
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            // This will still create transaction despite zero balance
            const transaction = await service.swap(params);
            expect(transaction).toBeDefined();
            console.log('Transaction created with zero SOL balance');
        });
    });

    describe('SOL Wrapping Edge Cases', () => {
        test('should handle maximum SOL amount', async () => {
            const maxSolAmount = BigInt('1000000000000000000'); // 1B SOL (unrealistic but tests overflow)

            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
            };

            (service as any).connection = mockConnection;

            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
                binStep: 10,
            };

            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            const params = {
                tokenMintX: mockPairInfo.tokenMintX,
                tokenMintY: mockPairInfo.tokenMintY,
                amount: maxSolAmount,
                otherAmountOffset: BigInt(1000000),
                swapForY: false,
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const transaction = await service.swap(params);
            expect(transaction).toBeDefined();
            console.log('Transaction created with maximum SOL amount');
        });

        test('should handle SOL wrapping in both directions', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
            };

            (service as any).connection = mockConnection;

            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
                binStep: 10,
            };

            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            // Test SOL to Token
            const paramsSolToToken = {
                tokenMintX: mockPairInfo.tokenMintX,
                tokenMintY: mockPairInfo.tokenMintY,
                amount: BigInt('1000000'),
                otherAmountOffset: BigInt(1000000),
                swapForY: false, // SOL to Token
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const tx1 = await service.swap(paramsSolToToken);
            expect(tx1).toBeDefined();

            // Test Token to SOL
            const paramsTokenToSol = {
                tokenMintX: mockPairInfo.tokenMintY,
                tokenMintY: mockPairInfo.tokenMintX,
                amount: BigInt('1000000'),
                otherAmountOffset: BigInt(1000000),
                swapForY: true, // Token to SOL
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const tx2 = await service.swap(paramsTokenToSol);
            expect(tx2).toBeDefined();

            console.log('Both SOL wrapping directions handled');
        });
    });

    describe('SOL Account Validation', () => {
        test('should not validate associated token account existence', async () => {
            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null), // Account doesn't exist
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
            };

            (service as any).connection = mockConnection;

            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
                binStep: 10,
            };

            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            const params = {
                tokenMintX: mockPairInfo.tokenMintX,
                tokenMintY: mockPairInfo.tokenMintY,
                amount: BigInt('1000000'),
                otherAmountOffset: BigInt(1000000),
                swapForY: false,
                isExactInput: true,
                pair: mockPair,
                hook: null,
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            // This will still create transaction even if associated token account doesn't exist
            const transaction = await service.swap(params);
            expect(transaction).toBeDefined();
            console.log('Transaction created without validating associated token account');
        });

        test('should handle concurrent SOL wrapping operations', async () => {
            // This test would require mocking concurrent operations
            // In a real scenario, this could lead to race conditions

            const mockConnection = {
                getAccountInfo: jest.fn().mockResolvedValue(null),
                getLatestBlockhash: jest.fn().mockResolvedValue({
                    blockhash: 'mock-blockhash',
                    lastValidBlockHeight: 1000000,
                }),
            };

            (service as any).connection = mockConnection;

            const mockPair = new PublicKey('11111111111111111111111111111112');
            const mockPairInfo = {
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
                binStep: 10,
            };

            jest.spyOn(service, 'getPairAccount').mockResolvedValue(mockPairInfo);

            const mockProgram = {
                methods: {
                    swap: jest.fn().mockReturnValue({
                        accountsPartial: jest.fn(() => ({
                            instruction: jest.fn(),
                        })),
                    }),
                },
                programId: new PublicKey('11111111111111111111111111111112'),
            };
            (service as any).lbProgram = mockProgram;

            // Simulate multiple concurrent operations
            const promises = [];
            for (let i = 0; i < 5; i++) {
                const params = {
                    tokenMintX: mockPairInfo.tokenMintX,
                    tokenMintY: mockPairInfo.tokenMintY,
                    amount: BigInt('100000'),
                    otherAmountOffset: BigInt(100000),
                    swapForY: false,
                    isExactInput: true,
                    pair: mockPair,
                    hook: null,
                    payer: new PublicKey('11111111111111111111111111111112'),
                };

                promises.push(service.swap(params));
            }

            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            results.forEach(tx => expect(tx).toBeDefined());

            console.log('Concurrent SOL wrapping operations completed');
        });
    });
});
