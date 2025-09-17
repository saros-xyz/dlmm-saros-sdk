import { describe, expect, it } from 'vitest';
import { SarosDLMM } from '../src';
import { MODE } from '../src/types';
import { PublicKey } from '@solana/web3.js';

const lbServices = new SarosDLMM({
  mode: MODE.MAINNET,
  options: {
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
});

describe('getPoolMetadata', () => {
  it('should fetch and validate metadata for USDC/USDT Pool', async () => {
    const poolId = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'; // USDC/USDT
    const metadata = await lbServices.getPoolMetadata(poolId);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseToken.mintAddress).toBe('string');
    expect(typeof metadata.quoteToken.mintAddress).toBe('string');
    expect(metadata.baseToken.mintAddress).not.toBe(metadata.quoteToken.mintAddress);
    expect(metadata.baseToken.decimals).toBe(6); // USDC
    expect(metadata.quoteToken.decimals).toBe(6); // USDT
  });

  it('should fetch and validate metadata for SOL/USDC Pool', async () => {
    const poolId = '8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS'; // SOL/USDC
    const metadata = await lbServices.getPoolMetadata(poolId);
    expect(metadata).toBeDefined();
    expect(metadata.poolAddress).toBe(poolId);
    expect(typeof metadata.baseToken.mintAddress).toBe('string');
    expect(typeof metadata.quoteToken.mintAddress).toBe('string');
    expect(metadata.baseToken.mintAddress).not.toBe(metadata.quoteToken.mintAddress);
    expect(metadata.baseToken.decimals).toBe(9); // SOL
    expect(metadata.quoteToken.decimals).toBe(6); // USDC
    expect(metadata.baseToken.mintAddress.toString()).toBe(
      'So11111111111111111111111111111111111111112'
    ); // SOL mint
    expect(metadata.quoteToken.mintAddress.toString()).toBe(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    ); // USDC mint
  });
});

describe('getAllPoolAddresses', () => {
  it('should fetch all pool addresses from the program', async () => {
    const poolAddresses = await lbServices.getAllPoolAddresses();
    expect(poolAddresses).toBeDefined();
    expect(Array.isArray(poolAddresses)).toBe(true);
    console.log(poolAddresses.length);
    expect(poolAddresses.length).toBeGreaterThan(0);

    // Each item should be string address
    poolAddresses.forEach((item) => {
      expect(item).toBeDefined();
      expect(typeof item).toBe('string');
    });
  });
});

describe('getPoolLiquidity', () => {
  it('should return liquidity data with active bin and bins', async () => {
    const poolId = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'; // USDC/USDT
    const liquidityData = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(poolId),
      arrayRange: 3,
    });

    expect(liquidityData.activeBin).toBeDefined();
    expect(liquidityData.binStep).toBeGreaterThan(0);
    expect(liquidityData.bins.length).toBeGreaterThan(0);

    // Should contain the active bin in the bins array
    const activeBin = liquidityData.bins.find((bin) => bin.binId === liquidityData.activeBin);
    expect(activeBin).toBeDefined();
  });

  it('should work with default arrayRange parameter', async () => {
    const poolId = '8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS'; // SOL/USDC
    const liquidityData = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(poolId),
    });

    expect(liquidityData.activeBin).toBeDefined();
    expect(liquidityData.bins.length).toBeGreaterThan(0);
  });

  it('should handle different arrayRange values correctly', async () => {
    const poolId = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'; // USDC/USDT

    const range1 = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(poolId),
      arrayRange: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const range5 = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(poolId),
      arrayRange: 5,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const range10 = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(poolId),
      arrayRange: 10,
    });

    // All should return valid data
    expect(range1.bins.length).toBeGreaterThan(0);
    expect(range5.bins.length).toBeGreaterThan(0);
    expect(range10.bins.length).toBeGreaterThan(0);

    // Active bin should be consistent across all ranges
    expect(range1.activeBin).toBe(range5.activeBin);
    expect(range5.activeBin).toBe(range10.activeBin);

    // Larger ranges should generally return more bins (or at least same amount)
    expect(range5.bins.length).toBeGreaterThanOrEqual(range1.bins.length);
    expect(range10.bins.length).toBeGreaterThanOrEqual(range5.bins.length);

    // Calculate total reserves across all bins for each range
    const range1TotalBase = range1.bins.reduce((sum, bin) => sum + bin.baseReserve, 0);
    const range5TotalBase = range5.bins.reduce((sum, bin) => sum + bin.baseReserve, 0);
    const range10TotalBase = range10.bins.reduce((sum, bin) => sum + bin.baseReserve, 0);

    const range1TotalQuote = range1.bins.reduce((sum, bin) => sum + bin.quoteReserve, 0);
    const range5TotalQuote = range5.bins.reduce((sum, bin) => sum + bin.quoteReserve, 0);
    const range10TotalQuote = range10.bins.reduce((sum, bin) => sum + bin.quoteReserve, 0);

    // Larger ranges should capture more total liquidity
    expect(range5TotalBase).toBeGreaterThanOrEqual(range1TotalBase);
    expect(range10TotalBase).toBeGreaterThanOrEqual(range5TotalBase);
    expect(range5TotalQuote).toBeGreaterThanOrEqual(range1TotalQuote);
    expect(range10TotalQuote).toBeGreaterThanOrEqual(range5TotalQuote);
  });

  it('should reject invalid pool addresses', async () => {
    const invalidPoolId = '11111111111111111111111111111111';

    await expect(
      lbServices.getPoolLiquidity({
        poolAddress: new PublicKey(invalidPoolId),
      })
    ).rejects.toThrow();
  });
});
