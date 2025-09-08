/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { jest } from '@jest/globals';

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => ({
    Connection: jest.fn().mockImplementation(() => ({
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
    })),
    PublicKey: class MockPublicKey {
        constructor(publicKeyString?: string | Buffer | Uint8Array | number[] | any) {
            if (typeof publicKeyString === 'string') {
                this.value = publicKeyString;
            } else if (publicKeyString instanceof Buffer || publicKeyString instanceof Uint8Array) {
                this.value = publicKeyString.toString();
            } else if (Array.isArray(publicKeyString)) {
                this.value = Buffer.from(publicKeyString).toString();
            } else {
                this.value = publicKeyString?.toString() || 'mock-public-key';
            }
        }
        value: string;
        toString() {
            return this.value;
        }
        toBase58() {
            return this.value + '-base58';
        }
        toBuffer() {
            return Buffer.from(this.value);
        }
        equals(other: any) {
            return this.value === other?.value;
        }
        static findProgramAddressSync(seeds: any[], programId: any) {
            // Create a new instance of the mocked PublicKey class
            const mockKey = Object.create(MockPublicKey.prototype);
            mockKey.value = 'mock-pda';
            mockKey.toString = () => 'mock-pda';
            mockKey.toBase58 = () => 'mock-pda-base58';
            mockKey.toBuffer = () => Buffer.from('mock-pda');
            mockKey.equals = jest.fn();
            return [mockKey, 255];
        }
    },
    Transaction: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        serialize: jest.fn(() => Buffer.from('serialized')),
    })),
    SystemProgram: {
        transfer: jest.fn(),
    },
    ComputeBudgetProgram: {
        setComputeUnitLimit: jest.fn(),
        setComputeUnitPrice: jest.fn(),
    },
    TOKEN_PROGRAM_ID: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    ASSOCIATED_TOKEN_PROGRAM_ID: { toString: () => 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' },
}));

// Mock @coral-xyz/anchor
jest.mock('@coral-xyz/anchor', () => ({
    BN: jest.fn().mockImplementation((...args: any[]) => ({
        toString: () => (args[0] || 0).toString(),
        toNumber: () => args[0] || 0,
        toArrayLike: jest.fn((buffer: any, endian: any, length: any) => Buffer.alloc(length)),
        isZero: () => (args[0] || 0) === 0,
        eq: jest.fn((other: any) => (args[0] || 0) === other),
        add: jest.fn((other: any) => ({ toNumber: () => (args[0] || 0) + other, isZero: () => ((args[0] || 0) + other) === 0 })),
        sub: jest.fn((other: any) => ({ toNumber: () => (args[0] || 0) - other, isZero: () => ((args[0] || 0) - other) === 0 })),
        mul: jest.fn((other: any) => ({ toNumber: () => (args[0] || 0) * other, isZero: () => ((args[0] || 0) * other) === 0 })),
        div: jest.fn((other: any) => ({ toNumber: () => Math.floor((args[0] || 0) / other), isZero: () => Math.floor((args[0] || 0) / other) === 0 })),
    })),
    AnchorProvider: class MockAnchorProvider {
        connection: any;
        wallet: any;
        constructor() {
            this.connection = {};
            this.wallet = {};
        }
        static defaultOptions() {
            return {};
        }
    },
    Program: jest.fn().mockImplementation(() => ({
        account: {
            pair: { fetch: jest.fn().mockResolvedValue({}) },
            position: { fetch: jest.fn().mockResolvedValue({}) },
            binArray: { fetch: jest.fn().mockResolvedValue({}) },
            presetParameter: { fetch: jest.fn().mockResolvedValue({}) },
            user: { fetch: jest.fn().mockResolvedValue({}) },
        },
        methods: {
            initializeBinArray: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            createPair: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            createPosition: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            addLiquidity: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            removeLiquidity: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            swap: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            initializePosition: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
            claimFee: jest.fn().mockReturnValue({
                accountsPartial: jest.fn(() => ({
                    instruction: jest.fn(),
                })),
            }),
        },
        programId: { toString: () => 'mock-program-id' },
    })),
    utils: {
        bytes: {
            utf8: {
                encode: jest.fn((str: string) => Buffer.from(str)),
            },
        },
    },
}));

// Mock @solana/spl-token
jest.mock('@solana/spl-token', () => ({
    TOKEN_PROGRAM_ID: { toBase58: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    TOKEN_2022_PROGRAM_ID: { toBase58: () => 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', toString: () => 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
    getAssociatedTokenAddressSync: jest.fn(() => ({ toString: () => 'mock-associated-token-address' })),
}));

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
