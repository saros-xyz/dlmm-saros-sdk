/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

// Simple setup file to avoid initialization issues
// Remove complex mocks and use individual test file mocks instead

// Global test setup
beforeAll(() => {
  // Any global setup can go here
});

afterAll(() => {
  // Any global cleanup can go here
});

// Mock LiquidityBookServices for integration tests
jest.mock('../services', () => ({
    LiquidityBookServices: jest.fn().mockImplementation((config?: any) => {
        const mode = config?.mode || 'devnet';
        const isMainnet = mode === 'mainnet';

        const mockInstance = {
            mode,
            getQuote: jest.fn(),
            getPairAccount: jest.fn(),
            fetchPoolMetadata: jest.fn(),
            swap: jest.fn(),
            createPosition: jest.fn(),
            addLiquidityIntoPosition: jest.fn(),
            removeMultipleLiquidity: jest.fn(),
            getUserPositions: jest.fn(),
            getUserVaultInfo: jest.fn(),
            getBinArrayInfo: jest.fn(),
            getBinsReserveInformation: jest.fn(),
            lbConfig: new (require('@solana/web3.js').PublicKey)(
                isMainnet ? 'BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8' : 'DK6EoxvbMxJTkgcTAYfUnKyDZUTKb6wwPUFfpWsgeiR9'
            ),
            hooksConfig: new (require('@solana/web3.js').PublicKey)(
                isMainnet ? 'DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF' : '2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES'
            ),
            connection: {
                getAccountInfo: jest.fn(),
                getLatestBlockhash: jest.fn(),
                sendRawTransaction: jest.fn(),
                confirmTransaction: jest.fn(),
                getProgramAccounts: jest.fn(),
                getTokenAccountBalance: jest.fn(),
                getParsedAccountInfo: jest.fn(),
                getSlot: jest.fn(() => Promise.resolve(123456789)),
                getBlockTime: jest.fn(() => Promise.resolve(Math.floor(Date.now() / 1000))),
                getParsedTokenAccountsByOwner: jest.fn(),
                onLogs: jest.fn(),
            },
            getDexName: jest.fn().mockReturnValue('Saros'),
            getDexProgramId: jest.fn().mockReturnValue(new (require('@solana/web3.js').PublicKey)('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')),
            fetchPoolAddresses: jest.fn().mockResolvedValue([
                new (require('@solana/web3.js').PublicKey)('C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB'),
                new (require('@solana/web3.js').PublicKey)('D8yWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQC'),
            ]),
            listenNewPoolAddress: jest.fn().mockResolvedValue(undefined),
        };

        // Set up mock return values
        mockInstance.getQuote.mockResolvedValue({
            amountIn: BigInt(1000000),
            amountOut: BigInt(990000),
            otherAmountOffset: BigInt(10000),
            amount: BigInt(1000000),
            priceImpact: 0.01,
        });
        mockInstance.getPairAccount.mockImplementation(async (poolAddress: any) => {
            // Actually use the connection to simulate real behavior
            try {
                await mockInstance.connection.getAccountInfo(poolAddress);
                return {
                    activeId: 8388608,
                    binStep: 10,
                    tokenMintX: { toString: () => 'tokenX' },
                    tokenMintY: { toString: () => 'tokenY' },
                    staticFeeParameters: {
                        baseFactor: 5000,
                        variableFeeControl: 10000,
                        protocolShare: 2000,
                        reductionFactor: 5000,
                        maxVolatilityAccumulator: 10000,
                    },
                    dynamicFeeParameters: {
                        volatilityAccumulator: 500,
                        volatilityReference: 100,
                        idReference: 8388608,
                        timeLastUpdated: { toNumber: () => 1234567890 },
                    },
                };
            } catch (error) {
                throw error;
            }
        });
        mockInstance.fetchPoolMetadata.mockResolvedValue({
            pairAddress: 'mock-pair-address',
            tokenXMint: 'mock-token-x',
            tokenYMint: 'mock-token-y',
            binStep: 10,
            activeId: 8388608,
        });
        mockInstance.swap.mockResolvedValue({
            transaction: { serialize: () => Buffer.from('mock-transaction') },
        });
        mockInstance.createPosition.mockResolvedValue({
            transaction: { serialize: () => Buffer.from('mock-transaction') },
            position: 'mock-position-address',
        });
        mockInstance.addLiquidityIntoPosition.mockResolvedValue({
            transaction: { serialize: () => Buffer.from('mock-transaction') },
        });
        mockInstance.removeMultipleLiquidity.mockResolvedValue({
            transactions: [{ serialize: () => Buffer.from('mock-transaction') }],
            txs: [{ serialize: () => Buffer.from('mock-transaction') }],
        });
        mockInstance.getUserPositions.mockResolvedValue([]);
        mockInstance.getUserVaultInfo.mockResolvedValue({
            tokenXAmount: BigInt(1000000),
            tokenYAmount: BigInt(2000000),
        });
        mockInstance.getBinArrayInfo.mockResolvedValue([]);
        mockInstance.getBinsReserveInformation.mockResolvedValue([]);

        return mockInstance;
    }),
}));
