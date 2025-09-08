import { LBSwapService } from '../../services/swap';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN, Program } from '@coral-xyz/anchor';

describe('LBSwapService', () => {
    let swapService: LBSwapService;
    let mockConnection: jest.Mocked<Connection>;
    let mockProgram: jest.Mocked<Program>;

    beforeEach(() => {
        mockConnection = new Connection('mock-url') as jest.Mocked<Connection>;
        mockConnection.getAccountInfo.mockResolvedValue(null);
        mockConnection.getProgramAccounts.mockResolvedValue([]);
        mockConnection.getSlot.mockResolvedValue(123456789);
        mockConnection.getBlockTime.mockResolvedValue(Math.floor(Date.now() / 1000));

        mockProgram = {
            programId: new PublicKey('11111111111111111111111111111112'),
            account: {
                pair: { fetch: jest.fn() },
                binArray: { fetch: jest.fn() },
            },
        } as any;

        swapService = new LBSwapService(mockProgram, mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with program and connection', () => {
            expect(swapService).toBeDefined();
            expect(swapService).toBeInstanceOf(LBSwapService);
        });

        test('should create instance from config', () => {
            const instance = LBSwapService.fromLbConfig(mockProgram, mockConnection);
            expect(instance).toBeInstanceOf(LBSwapService);
        });
    });

    describe('Fee Calculations', () => {
        test('should calculate base fee correctly', () => {
            const binStep = 10;
            const baseFactor = 5000;
            const expectedFee = BigInt(500000); // binStep * baseFactor * 10

            const result = swapService.getBaseFee(binStep, baseFactor);

            expect(result).toBe(expectedFee);
        });

        test('should calculate fee for amount correctly', () => {
            const amount = BigInt(1000000);
            const fee = BigInt(5000); // 0.5%
            const expectedFeeAmount = BigInt(6); // Correct calculation result

            const result = swapService.getFeeForAmount(amount, fee);

            expect(result).toBe(expectedFeeAmount);
        });

        test('should calculate fee amount correctly', () => {
            const amount = BigInt(1000000);
            const fee = BigInt(5000); // 0.5%
            const expectedFeeAmount = BigInt(5); // Correct calculation result

            const result = swapService.getFeeAmount(amount, fee);

            expect(result).toBe(expectedFeeAmount);
        });

        test('should calculate protocol fee correctly', () => {
            const fee = BigInt(5000);
            const protocolShare = BigInt(2000); // 20%
            const expectedProtocolFee = BigInt(1000); // fee * protocolShare / BASIS_POINT_MAX

            const result = swapService.getProtocolFee(fee, protocolShare);

            expect(result).toBe(expectedProtocolFee);
        });

        test('should calculate total fee for pair', () => {
            const mockPairInfo = {
                staticFeeParameters: {
                    baseFactor: 5000,
                    variableFeeControl: 10000,
                    protocolShare: 2000,
                    reductionFactor: 5000,
                },
                binStep: 10,
            } as any;

            const result = swapService.getTotalFee(mockPairInfo);

            expect(typeof result).toBe('bigint');
            expect(result).toBeGreaterThan(BigInt(0));
        });

        test('should calculate variable fee correctly', () => {
            const mockPairInfo = {
                staticFeeParameters: {
                    variableFeeControl: 10000,
                    reductionFactor: 5000,
                },
                dynamicFeeParameters: {
                    volatilityReference: 100,
                    idReference: 50,
                    volatilityAccumulator: 500,
                },
                binStep: 10,
            } as any;

            // Initialize service properties
            swapService.volatilityAccumulator = 500;
            swapService.volatilityReference = 100;

            const result = swapService.getVariableFee(mockPairInfo);

            expect(typeof result).toBe('bigint');
        });
    });

    describe('Volatility Updates', () => {
        test('should update volatility reference', () => {
            const mockPairInfo = {
                dynamicFeeParameters: {
                    volatilityReference: 100,
                    volatilityAccumulator: 500,
                },
                staticFeeParameters: {
                    reductionFactor: 5000,
                },
            } as any;

            swapService.updateVolatilityReference(mockPairInfo);

            expect(mockPairInfo.dynamicFeeParameters.volatilityReference).toBeDefined();
        });

        test('should update volatility accumulator', () => {
            const mockPairInfo = {
                dynamicFeeParameters: {
                    volatilityAccumulator: 500,
                },
                staticFeeParameters: {
                    maxVolatilityAccumulator: 10000,
                },
            } as any;
            const activeId = 1000;

            swapService.updateVolatilityAccumulator(mockPairInfo, activeId);

            expect(mockPairInfo.dynamicFeeParameters.volatilityAccumulator).toBeDefined();
        });
    });

    describe('Bin Array Operations', () => {
        test('should get bin array address', () => {
            const params = {
                binArrayIndex: 0,
                pair: new PublicKey('11111111111111111111111111111112'),
            };

            const result = swapService.getBinArray(params);

            expect(result).toBeInstanceOf(PublicKey);
        });
    });

    describe('Swap Calculations', () => {
        const mockPairInfo = {
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
                idReference: 1000,
                timeLastUpdated: new BN(1234567890),
            },
            binStep: 10,
            activeId: 8388608, // Use the reference point for realistic pricing
        } as any;

        const mockBinRange = {
            getBinMut: jest.fn(() => ({
                totalSupply: new BN(1000000),
                reserveX: new BN(500000),
                reserveY: new BN(500000),
            })),
            getAllBins: jest.fn(() => [
                {
                    totalSupply: new BN(1000000),
                    reserveX: new BN(500000),
                    reserveY: new BN(500000),
                },
            ]),
        } as any;

        test('should calculate amount in for exact output', async () => {
            const amount = BigInt(990000);
            const swapForY = true;

            const result = await swapService.calculateAmountIn(
                amount,
                mockBinRange,
                mockPairInfo,
                swapForY
            );

            expect(typeof result).toBe('bigint');
        });

        test('should calculate amount out for exact input', async () => {
            const amount = BigInt(1000000);
            const swapForY = true;

            const result = await swapService.calculateAmountOut(
                amount,
                mockBinRange,
                mockPairInfo,
                swapForY
            );

            expect(typeof result).toBe('bigint');
        });
    });

    describe('Swap Operations', () => {
        test('should perform exact input swap', () => {
            const params = {
                binStep: 10,
                activeId: 8388608,
                amountInLeft: BigInt(1000000),
                fee: BigInt(5000),
                protocolShare: 2000,
                swapForY: true,
                reserveX: new BN(500000),
                reserveY: new BN(500000),
            };

            const result = swapService.swapExactInput(params);

            expect(result).toHaveProperty('amountInWithFees');
            expect(result).toHaveProperty('amountOut');
            expect(result).toHaveProperty('feeAmount');
            expect(result).toHaveProperty('protocolFeeAmount');
            expect(typeof result.amountInWithFees).toBe('bigint');
            expect(typeof result.amountOut).toBe('bigint');
        });

        test('should perform exact output swap', () => {
            const params = {
                binStep: 10,
                activeId: 8388608,
                amountOutLeft: BigInt(990000),
                fee: BigInt(5000),
                protocolShare: 2000,
                swapForY: true,
                reserveX: new BN(500000),
                reserveY: new BN(500000),
            };

            const result = swapService.swapExactOutput(params);

            expect(result).toHaveProperty('amountInWithFees');
            expect(result).toHaveProperty('amountOut');
            expect(result).toHaveProperty('feeAmount');
            expect(result).toHaveProperty('protocolFeeAmount');
            expect(typeof result.amountInWithFees).toBe('bigint');
            expect(typeof result.amountOut).toBe('bigint');
        });
    });

    describe('Reference Updates', () => {
        test('should update references successfully', async () => {
            const mockPairInfo = {
                staticFeeParameters: {
                    baseFactor: 5000,
                    reductionFactor: 5000,
                },
                dynamicFeeParameters: {
                    volatilityReference: 100,
                    volatilityAccumulator: 500,
                    idReference: 1000,
                    timeLastUpdated: new BN(1234567890),
                },
            } as any;
            const activeId = 1000;

            await swapService.updateReferences(mockPairInfo, activeId);

            expect(mockPairInfo.dynamicFeeParameters.volatilityReference).toBeDefined();
        });
    });
});
