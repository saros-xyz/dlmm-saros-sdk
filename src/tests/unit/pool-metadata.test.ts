import { describe, expect, it } from 'vitest';
import { MODE } from '../../types';
import { PublicKey } from '@solana/web3.js';
import { PoolServiceError } from '../../services/pools/errors';
import { SarosDLMM } from '../../services';

const lbServices = new SarosDLMM({
  mode: MODE.MAINNET,
  options: {
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  },
});

// Test constants
const POOLS = {
  USDC_USDT: {
    address: '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk',
    baseDecimals: 6,
    quoteDecimals: 6,
  },
  SOL_USDC: {
    address: '8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS',
    baseDecimals: 9,
    quoteDecimals: 6,
  },
  INVALID: {
    address: '11111111111111111111111111111111',
  },
} as const;

describe('Pool Metadata', () => {
  it('fetches SOL/USDC metadata', async () => {
    const metadata = await lbServices.getPoolMetadata(POOLS.SOL_USDC.address);

    expect(metadata.poolAddress).toBe(POOLS.SOL_USDC.address);
    expect(metadata.baseToken.decimals).toBe(POOLS.SOL_USDC.baseDecimals);
    expect(metadata.quoteToken.decimals).toBe(POOLS.SOL_USDC.quoteDecimals);
  });

  it('throws PoolNotFound for invalid pool', async () => {
    await expect(lbServices.getPoolMetadata(POOLS.INVALID.address)).rejects.toThrow(
      PoolServiceError.PoolNotFound
    );
  });
});

describe('Pool Discovery', () => {
  it('returns array of pool addresses', async () => {
    const addresses = await lbServices.getAllPoolAddresses();

    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0]).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 format
  });
});

describe('Pool Liquidity', () => {
  it('returns liquidity data with default range', async () => {
    const data = await lbServices.getPoolLiquidity({
      poolAddress: new PublicKey(POOLS.USDC_USDT.address),
    });

    expect(typeof data.activeBin).toBe('number');
    expect(data.binStep).toBeGreaterThan(0);
    expect(data.bins.length).toBeGreaterThan(0);
  });

  it('respects custom arrayRange', async () => {
    const [small, large] = await Promise.all([
      lbServices.getPoolLiquidity({
        poolAddress: new PublicKey(POOLS.USDC_USDT.address),
        numberOfBinArrays: 1,
      }),
      lbServices.getPoolLiquidity({
        poolAddress: new PublicKey(POOLS.USDC_USDT.address),
        numberOfBinArrays: 5,
      }),
    ]);

    const smallTotal = small.bins.reduce((sum, bin) => sum + bin.baseReserve + bin.quoteReserve, 0);
    const largeTotal = large.bins.reduce((sum, bin) => sum + bin.baseReserve + bin.quoteReserve, 0);

    expect(small.activeBin).toBe(large.activeBin);
    expect(large.bins.length).toBeGreaterThanOrEqual(small.bins.length);
    expect(largeTotal).toBeGreaterThanOrEqual(smallTotal);
  });
});
