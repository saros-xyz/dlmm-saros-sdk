import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey } from '@solana/web3.js';

describe('Integration Tests', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('Complete Swap Flow', () => {
        test('should complete a full swap flow', async () => {
            // Mock tokens (WSOL and SAROS on devnet)
            const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');
            const sarosMint = new PublicKey('mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N');
            const poolAddress = new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB');
            const userWallet = new PublicKey('11111111111111111111111111111112');

            // Step 1: Get quote
            const quoteParams = {
                amount: BigInt(1000000), // 1 WSOL (9 decimals)
                isExactInput: true,
                swapForY: true, // WSOL to SAROS
                pair: poolAddress,
                tokenBase: wsolMint,
                tokenQuote: sarosMint,
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: 0.5,
            };

            const quote = await service.getQuote(quoteParams);
            expect(quote).toHaveProperty('amountIn');
            expect(quote).toHaveProperty('amountOut');
            expect(quote.amountIn).toBeGreaterThan(BigInt(0));
            expect(quote.amountOut).toBeGreaterThan(BigInt(0));

            // Step 2: Create swap transaction
            const swapParams = {
                amount: quote.amount,
                tokenMintX: wsolMint,
                tokenMintY: sarosMint,
                otherAmountOffset: quote.otherAmountOffset,
                swapForY: true,
                isExactInput: true,
                pair: poolAddress,
                hook: service.hooksConfig,
                payer: userWallet,
            };

            const transaction = await service.swap(swapParams);
            expect(transaction).toBeDefined();
            expect(typeof transaction).toBe('object');
        });
    });

    describe('Pool Information Flow', () => {
        test('should retrieve comprehensive pool information', async () => {
            const poolAddress = 'C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB';

            // Get pool metadata
            const metadata = await service.fetchPoolMetadata(poolAddress);
            expect(typeof metadata).toBe('object');

            // Get DEX information
            const dexName = service.getDexName();
            const dexProgramId = service.getDexProgramId();
            expect(typeof dexName).toBe('string');
            expect(dexProgramId).toBeDefined();

            // Get all pools
            const pools = await service.fetchPoolAddresses();
            expect(Array.isArray(pools)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid pool addresses gracefully', async () => {
            const invalidAddress = 'invalid-address';

            await expect(service.fetchPoolMetadata(invalidAddress)).resolves.toBeDefined();
            // Should not throw, but return empty or default value
        });

        test('should handle network errors gracefully', async () => {
            // Mock a network failure scenario
            const mockConnection = service.connection as any;
            const originalGetAccountInfo = mockConnection.getAccountInfo;
            mockConnection.getAccountInfo = jest.fn().mockRejectedValue(new Error('Network error'));

            const poolAddress = new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB');

            await expect(service.getPairAccount(poolAddress)).rejects.toThrow();

            // Restore original function
            mockConnection.getAccountInfo = originalGetAccountInfo;
        });
    });
});
