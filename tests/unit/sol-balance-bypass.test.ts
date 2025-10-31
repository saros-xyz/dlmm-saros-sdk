/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { LiquidityBookServices } from '../../services';
import { MODE } from '../../types/config';
import { PublicKey, Connection } from '@solana/web3.js';

describe('SOL Balance Validation Bypass Bug Tests', () => {
    let service: LiquidityBookServices;
    let mockConnection: any;

    beforeEach(() => {
        mockConnection = {
            getTokenAccountBalance: jest.fn(),
        };

        service = new LiquidityBookServices({
            mode: MODE.DEVNET,
        });

        // Mock the connection
        (service as any).connection = mockConnection;
    });

    describe('fetchPoolMetadata Balance Bypass', () => {
        test('should detect balance validation bypass when getTokenAccountBalance fails', async () => {
            // Mock the lbProgram and pair account
            const mockPairInfo = {
                tokenMintX: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
                tokenMintY: new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL
            };

            (service as any).lbProgram = {
                account: {
                    pair: {
                        fetch: jest.fn().mockResolvedValue(mockPairInfo),
                    },
                },
            };

            // Mock getPairVaultInfo to return vault addresses
            (service as any).getPairVaultInfo = jest.fn().mockResolvedValue(
                new PublicKey('11111111111111111111111111111112')
            );

            // Simulate getTokenAccountBalance failure
            mockConnection.getTokenAccountBalance.mockRejectedValue(
                new Error('Token account not found')
            );

            const pairAddress = '11111111111111111111111111111112';

            // The method should complete without throwing due to .catch() bypass
            const result = await service.fetchPoolMetadata(pairAddress);

            console.log('fetchPoolMetadata result with failed balance check:', result);

            // The main issue is that it doesn't throw - it silently returns defaults
            expect(result).toBeDefined();
            // The exact structure depends on the mock, but the point is it doesn't fail
        });

        test('should show proper error handling without bypass', async () => {
            // This test shows what SHOULD happen without the bypass
            mockConnection.getTokenAccountBalance.mockRejectedValue(
                new Error('Token account not found')
            );

            // Without the .catch() bypass, this would properly throw
            // But the current implementation silently returns defaults
            console.log('Current implementation bypasses balance validation errors');
            console.log('This could mask real issues with token accounts');
        });
    });
});
