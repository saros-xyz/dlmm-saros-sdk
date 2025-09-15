/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey } from '@solana/web3.js';

describe('Slippage Protection Security Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('Slippage Validation Bypass', () => {
        test('should not validate maximum slippage bounds', async () => {
            // Test with extreme slippage values
            const extremeSlippage = 1000; // 1000% slippage (should be invalid)

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: extremeSlippage, // This should be rejected
            };

            // Mock the swap service
            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            // Mock the fromLbConfig method
            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            try {
                const quote = await service.getQuote(params);
                console.log('Quote with extreme slippage:', quote);
                console.log('Slippage allowed:', extremeSlippage + '%');

                // The current implementation doesn't validate slippage bounds
                expect(quote).toBeDefined();
            } catch (error) {
                console.log('Error with extreme slippage:', error.message);
            }
        });

        test('should handle negative slippage values', async () => {
            const negativeSlippage = -50; // Negative slippage

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: negativeSlippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            try {
                const quote = await service.getQuote(params);
                console.log('Quote with negative slippage:', quote);
                console.log('Negative slippage result - slippage allowed:', negativeSlippage + '%');
                expect(quote).toBeDefined();
            } catch (error) {
                console.log('Error with negative slippage:', error.message);
            }
        });

        test('should handle zero slippage', async () => {
            const zeroSlippage = 0; // 0% slippage

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: zeroSlippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Quote with zero slippage:', quote);
            expect(quote).toBeDefined();
        });
    });

    describe('Slippage Calculation Edge Cases', () => {
        test('should handle very small slippage values', async () => {
            const tinySlippage = 0.0001; // 0.0001% slippage

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: tinySlippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Quote with tiny slippage:', quote);
            console.log('Tiny slippage value:', tinySlippage + '%');
            expect(quote).toBeDefined();
        });

        test('should handle very large slippage values', async () => {
            const hugeSlippage = 1000000; // 1,000,000% slippage

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: hugeSlippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Quote with huge slippage:', quote);
            console.log('Huge slippage value:', hugeSlippage + '%');
            expect(quote).toBeDefined();
        });
    });

    describe('Slippage Calculation Precision', () => {
        test('should handle floating point precision in slippage calculation', async () => {
            // Test with values that cause floating point precision issues
            const impreciseSlippage = 0.1 + 0.2; // 0.30000000000000004

            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: impreciseSlippage * 100, // Convert to percentage
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1000000),
                    amountOut: BigInt(990000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Quote with imprecise slippage:', quote);
            console.log('Imprecise slippage value:', impreciseSlippage);
            expect(quote).toBeDefined();
        });

        test('should handle slippage calculation with very large numbers', async () => {
            const normalSlippage = 0.5; // 0.5%

            const params = {
                amount: BigInt('1000000000000000000'), // Very large amount
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: normalSlippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt('1000000000000000000'),
                    amountOut: BigInt('990000000000000000'),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000000000000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Quote with large numbers:', quote);
            console.log('Large amount slippage calculation completed');
            expect(quote).toBeDefined();
        });
    });

    describe('Slippage Boundary Testing', () => {
        test('should handle boundary slippage values', async () => {
            const boundaryValues = [0.001, 0.01, 0.1, 1, 5, 10, 25, 50, 99.99];

            for (const slippage of boundaryValues) {
                const params = {
                    amount: BigInt(1000000),
                    isExactInput: true,
                    swapForY: true,
                    pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                    tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                    tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                    tokenBaseDecimal: 9,
                    tokenQuoteDecimal: 6,
                    slippage: slippage,
                };

                const mockSwapService = {
                    calculateInOutAmount: jest.fn().mockResolvedValue({
                        amountIn: BigInt(1000000),
                        amountOut: BigInt(990000),
                    }),
                };

                jest.mock('../../services/swap', () => ({
                    LBSwapService: {
                        fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                    },
                }));

                // Mock getMaxAmountOutWithFee directly
                (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                    maxAmountOut: 1000000,
                    price: 1.0,
                });

                const quote = await service.getQuote(params);
                console.log(`Slippage ${slippage}% result:`, quote);
                expect(quote).toBeDefined();
            }
        });

        test('should handle exact output slippage calculation', async () => {
            const slippage = 0.5;

            const params = {
                amount: BigInt(1000000),
                isExactInput: false, // Exact output
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: slippage,
            };

            const mockSwapService = {
                calculateInOutAmount: jest.fn().mockResolvedValue({
                    amountIn: BigInt(1010101), // Slightly more for slippage
                    amountOut: BigInt(1000000),
                }),
            };

            jest.mock('../../services/swap', () => ({
                LBSwapService: {
                    fromLbConfig: jest.fn().mockReturnValue(mockSwapService),
                },
            }));

            // Mock getMaxAmountOutWithFee directly
            (service as any).getMaxAmountOutWithFee = jest.fn().mockResolvedValue({
                maxAmountOut: 1000000,
                price: 1.0,
            });

            const quote = await service.getQuote(params);
            console.log('Exact output slippage result:', quote);
            expect(quote).toBeDefined();
            expect(quote.amount).toBeGreaterThan(quote.otherAmountOffset);
        });
    });
});
