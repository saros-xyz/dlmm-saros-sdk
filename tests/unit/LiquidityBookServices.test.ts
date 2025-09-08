import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey, Transaction } from '@solana/web3.js';

describe('LiquidityBookServices', () => {
    let service: LiquidityBookServices;

    beforeEach(() => {
        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });
    });

    describe('Initialization', () => {
        test('should initialize with DEVNET mode', () => {
            expect(service.mode).toBe(MODE.DEVNET);
        });

        test('should initialize with MAINNET mode', () => {
            const mainnetService = new LiquidityBookServices({
                mode: MODE.MAINNET,
            });
            expect(mainnetService.mode).toBe(MODE.MAINNET);
        });
    });

    describe('Configuration', () => {
        test('should return correct lbConfig for DEVNET', () => {
            const config = service.lbConfig;
            expect(config).toBeInstanceOf(PublicKey);
            expect(config.toString()).toBe('DK6EoxvbMxJTkgcTAYfUnKyDZUTKb6wwPUFfpWsgeiR9');
        });

        test('should return correct lbConfig for MAINNET', () => {
            const mainnetService = new LiquidityBookServices({
                mode: MODE.MAINNET,
            });
            const config = mainnetService.lbConfig;
            expect(config.toString()).toBe('BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8');
        });

        test('should return correct hooksConfig for DEVNET', () => {
            const config = service.hooksConfig;
            expect(config.toString()).toBe('2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES');
        });

        test('should return correct hooksConfig for MAINNET', () => {
            const mainnetService = new LiquidityBookServices({
                mode: MODE.MAINNET,
            });
            const config = mainnetService.hooksConfig;
            expect(config.toString()).toBe('DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF');
        });
    });

    describe('DEX Info', () => {
        test('should return DEX name', () => {
            const name = service.getDexName();
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        });

        test('should return DEX program ID', () => {
            const programId = service.getDexProgramId();
            expect(programId).toBeDefined();
        });
    });

    describe('Pool Operations', () => {
        test('should fetch pool addresses', async () => {
            const addresses = await service.fetchPoolAddresses();
            expect(Array.isArray(addresses)).toBe(true);
        });

        test('should fetch pool metadata', async () => {
            const mockAddress = 'C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB';
            const metadata = await service.fetchPoolMetadata(mockAddress);
            expect(typeof metadata).toBe('object');
        });
    });

    describe('Quote Operations', () => {
        test('should get quote for swap', async () => {
            const params = {
                amount: BigInt(1000000),
                isExactInput: true,
                swapForY: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenBase: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenQuote: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenBaseDecimal: 9,
                tokenQuoteDecimal: 6,
                slippage: 0.5,
            };

            const quote = await service.getQuote(params);
            expect(quote).toHaveProperty('amountIn');
            expect(quote).toHaveProperty('amountOut');
            expect(quote).toHaveProperty('priceImpact');
        });
    });

    describe('Swap Operations', () => {
        test('should create swap transaction', async () => {
            const params = {
                amount: BigInt(1000000),
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                otherAmountOffset: BigInt(0),
                swapForY: true,
                isExactInput: true,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                hook: new PublicKey('2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES'),
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const transaction = await service.swap(params);
            expect(transaction).toBeInstanceOf(Object);
        });
    });

    describe('Position Operations', () => {
        test('should create position with valid params', async () => {
            // Mock the required parameters for createPosition
            const mockTransaction = new Transaction();
            const mockPositionMint = new PublicKey('11111111111111111111111111111112');

            const params = {
                payer: new PublicKey('11111111111111111111111111111112'),
                relativeBinIdLeft: -10,
                relativeBinIdRight: 10,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                binArrayIndex: 0,
                positionMint: mockPositionMint,
                transaction: mockTransaction,
            };

            const result = await service.createPosition(params);
            expect(result).toHaveProperty('position');
            expect(typeof result.position).toBe('string');
        });

        test('should add liquidity to position with valid params', async () => {
            // Mock the required parameters for addLiquidityIntoPosition
            const mockTransaction = new Transaction();
            const mockPositionMint = new PublicKey('11111111111111111111111111111112');

            const params = {
                positionMint: mockPositionMint,
                payer: new PublicKey('11111111111111111111111111111112'),
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                transaction: mockTransaction,
                liquidityDistribution: [{
                    relativeBinId: 0,
                    distributionX: 50,
                    distributionY: 50,
                }],
                amountY: 1000000,
                amountX: 1000000,
                binArrayLower: new PublicKey('11111111111111111111111111111112'),
                binArrayUpper: new PublicKey('11111111111111111111111111111112'),
            };

            const result = await service.addLiquidityIntoPosition(params);
            expect(result).toBeDefined();
        });

        test('should remove multiple liquidity with valid params', async () => {
            const params = {
                maxPositionList: [{
                    position: 'mock-position',
                    start: 100,
                    end: 200,
                    positionMint: 'mock-mint',
                }],
                payer: new PublicKey('11111111111111111111111111111112'),
                type: 'removeBoth' as const,
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                tokenMintX: new PublicKey('So11111111111111111111111111111111111111112'),
                tokenMintY: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                activeId: 8388608,
            };

            const result = await service.removeMultipleLiquidity(params);
            expect(result).toHaveProperty('txs');
            expect(Array.isArray(result.txs)).toBe(true);
        });
    });

    describe('User Operations', () => {
        test('should get user positions with valid params', async () => {
            const params = {
                payer: new PublicKey('11111111111111111111111111111112'),
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
            };

            const positions = await service.getUserPositions(params);
            expect(Array.isArray(positions)).toBe(true);
        });

        test('should get user vault info with valid params', async () => {
            const params = {
                tokenAddress: new PublicKey('So11111111111111111111111111111111111111112'),
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const vaultInfo = await service.getUserVaultInfo(params);
            expect(typeof vaultInfo).toBe('object');
        });
    });

    describe('User Operations', () => {
        test('should get user positions with valid params', async () => {
            const params = {
                payer: new PublicKey('11111111111111111111111111111112'),
                pair: new PublicKey('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
            };

            const positions = await service.getUserPositions(params);
            expect(Array.isArray(positions)).toBe(true);
        });

        test('should get user vault info with valid params', async () => {
            const params = {
                tokenAddress: new PublicKey('So11111111111111111111111111111111111111112'),
                payer: new PublicKey('11111111111111111111111111111112'),
            };

            const vaultInfo = await service.getUserVaultInfo(params);
            expect(typeof vaultInfo).toBe('object');
        });
    });

    describe('Event Listening', () => {
        test('should listen for new pool addresses', async () => {
            const callback = jest.fn();
            await service.listenNewPoolAddress(callback);
            // Note: In a real test, you'd need to mock the connection and emit events
            expect(callback).toHaveBeenCalledTimes(0); // Initially not called
        });
    });
});
