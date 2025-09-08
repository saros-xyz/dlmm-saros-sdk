import {
    createUniformDistribution,
    getMaxPosition,
    getMaxBinArray,
    getBinRange,
    findPosition,
    getGasPrice,
} from '../../utils';
import { LiquidityShape } from '../../types/services';
import { Connection } from '@solana/web3.js';

describe('Utils', () => {
    describe('createUniformDistribution', () => {
        test('should create uniform distribution for spot shape', () => {
            const params = {
                shape: LiquidityShape.Spot,
                binRange: [100, 200] as [number, number],
            };

            const distribution = createUniformDistribution(params);
            expect(Array.isArray(distribution)).toBe(true);
            expect(distribution.length).toBeGreaterThan(0);
            expect(distribution[0]).toHaveProperty('relativeBinId');
            expect(distribution[0]).toHaveProperty('distributionX');
            expect(distribution[0]).toHaveProperty('distributionY');
        });

        test('should create uniform distribution for curve shape', () => {
            const params = {
                shape: LiquidityShape.Curve,
                binRange: [100, 200] as [number, number],
            };

            const distribution = createUniformDistribution(params);
            expect(Array.isArray(distribution)).toBe(true);
        });

        test('should create uniform distribution for bid-ask shape', () => {
            const params = {
                shape: LiquidityShape.BidAsk,
                binRange: [100, 200] as [number, number],
            };

            const distribution = createUniformDistribution(params);
            expect(Array.isArray(distribution)).toBe(true);
        });
    });

    describe('getMaxPosition', () => {
        test('should calculate max position correctly', () => {
            const range: [number, number] = [100, 200];
            const activeId = 150;

            const maxPosition = getMaxPosition(range, activeId);
            expect(Array.isArray(maxPosition)).toBe(true);
            expect(maxPosition.length).toBeGreaterThan(0);
            expect(typeof maxPosition[0]).toBe('number');
        });

        test('should handle edge case with activeId at range start', () => {
            const range: [number, number] = [100, 200];
            const activeId = 100;

            const maxPosition = getMaxPosition(range, activeId);
            expect(Array.isArray(maxPosition)).toBe(true);
        });

        test('should handle edge case with activeId at range end', () => {
            const range: [number, number] = [100, 200];
            const activeId = 200;

            const maxPosition = getMaxPosition(range, activeId);
            expect(Array.isArray(maxPosition)).toBe(true);
        });
    });

    describe('getMaxBinArray', () => {
        test('should calculate max bin array correctly', () => {
            const range: [number, number] = [100, 200];
            const activeId = 150;

            const maxBinArray = getMaxBinArray(range, activeId);
            expect(Array.isArray(maxBinArray)).toBe(true);
            expect(maxBinArray.length).toBeGreaterThan(0);
        });
    });

    describe('getBinRange', () => {
        test('should get bin range for given index', () => {
            const index = 10;
            const activeId = 150;

            const binRange = getBinRange(index, activeId);
            expect(typeof binRange).toBe('object');
            expect(binRange).toHaveProperty('range');
            expect(binRange).toHaveProperty('binLower');
            expect(binRange).toHaveProperty('binUpper');
            expect(Array.isArray(binRange.range)).toBe(true);
            expect(binRange.range.length).toBe(2);
            expect(typeof binRange.range[0]).toBe('number');
            expect(typeof binRange.range[1]).toBe('number');
        });
    });

    describe('findPosition', () => {
        test('should find position for given index', () => {
            const index = 150;
            const activeBin = 150;

            const position = findPosition(index, activeBin);
            expect(typeof position).toBe('function');

            // Test the returned function
            const mockPosition = {
                pair: 'mock-pair',
                positionMint: 'mock-mint',
                position: 'mock-position',
                liquidityShares: ['100'],
                lowerBinId: 140,
                upperBinId: 160,
                space: [10],
            };

            const result = position(mockPosition);
            expect(typeof result).toBe('boolean');
        });

        test('should find position with default activeBin', () => {
            const index = 150;

            const position = findPosition(index);
            expect(typeof position).toBe('function');
        });
    });

    describe('getGasPrice', () => {
        test('should get gas price from connection', async () => {
            const mockConnection = {
                getRecentPrioritizationFees: jest.fn().mockResolvedValue([
                    { prioritizationFee: 1000 },
                    { prioritizationFee: 2000 },
                ]),
            } as any;

            const gasPrice = await getGasPrice(mockConnection);
            expect(typeof gasPrice).toBe('number');
            expect(gasPrice).toBeGreaterThanOrEqual(0);
        });
    });
});
