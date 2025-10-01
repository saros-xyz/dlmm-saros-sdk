import { describe, expect, it } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { SarosDLMMError } from '../../utils/errors';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';

// Single connection + SDK instance for all tests
const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

// Test pool constants
const POOLS = {
  USDC_USDT: {
    address: '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk',
    tokenXDecimals: 6,
    tokenYDecimals: 6,
  },
  SOL_USDC: {
    address: '8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS',
    tokenXDecimals: 9,
    tokenYDecimals: 6,
  },
  INVALID: {
    address: '11111111111111111111111111111111',
  },
} as const;

// Fee normalization test pools with expected values
const FEE_TEST_POOLS = {
  ZERO_VOLATILITY_100: {
    address: '7LxJjKPdpQ4tRrpDTQgBdxyjG7Ve4GUE6ZMo8W98qn5Z',
    expectedBinStep: 100,
    expectedBaseFee: 1.0,
    minProtocolFee: 0.2, // At least 20% of base fee
    minDynamicFee: 1.0, // At least the base fee
  },
  ZERO_VOLATILITY_1: {
    address: '7hc6hXjDPcFnhGBPBGTKUtViFsQuyWw8ph4ePHF1aTYG',
    expectedBinStep: 1,
    expectedBaseFee: 0.01,
    minProtocolFee: 0.002,
    minDynamicFee: 0.01,
  },
  HIGH_VOLATILITY: {
    address: 'E3fgKeShQeUfXcbzWS71J674fQQ8kEkt5thrYA57MWfi',
    expectedBinStep: 100,
    expectedBaseFee: 1.0,
    minProtocolFee: 0.2,
    minDynamicFee: 1.0,
  },
  ORIGINAL_EXAMPLE: {
    address: 'EBe9p6UWqE6SJDhZu87pbZ4wPwce92ubTJNV6ijU6vCc',
    expectedBinStep: 100,
    expectedBaseFee: 1.0,
    minProtocolFee: 0.2,
    minDynamicFee: 1.0,
  },
} as const;

// Token mint addresses
const TOKEN_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  SOL: 'So11111111111111111111111111111111111111112',
  LAUNCHCOIN: 'Ey59PH7Z4BFU4HjyKnyMdWt5GGN76KazTAwQihoUXRnk',
} as const;

describe('Pool Metadata', () => {
  it('fetches SOL/USDC metadata', async () => {
    const pair = await sdk.getPair(new PublicKey(POOLS.SOL_USDC.address));
    const metadata = pair.getPairMetadata();

    expect(metadata.pair.toString()).toBe(POOLS.SOL_USDC.address);
    expect(metadata.tokenX.decimals).toBe(POOLS.SOL_USDC.tokenXDecimals);
    expect(metadata.tokenY.decimals).toBe(POOLS.SOL_USDC.tokenYDecimals);
  });

  it('throws SarosDLMMError for invalid pool', async () => {
    await expect(sdk.getPair(new PublicKey(POOLS.INVALID.address))).rejects.toThrow(SarosDLMMError.PairFetchFailed());
  });
});

describe('Pool Discovery', () => {
  it('returns array of pool addresses', async () => {
    const addresses = await sdk.getAllPairAddresses();

    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0]).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 format
  });

  it('searches pairs by USDC and SOL token mint', async () => {
    const addresses = await sdk.findPairs(new PublicKey(TOKEN_MINTS.USDC), new PublicKey(TOKEN_MINTS.SOL));
    console.log(addresses);
    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(2); // we have at least three (oct. 2025)
    addresses.forEach((address) => {
      expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });
  });

  it('searches pairs by USDC token mint', async () => {
    const addresses = await sdk.findPairs(new PublicKey(TOKEN_MINTS.USDC));
    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    addresses.forEach((address) => {
      expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });
  });

  it('fetches multiple pairs with getPairs', async () => {
    const pairAddresses = [new PublicKey(POOLS.SOL_USDC.address), new PublicKey(POOLS.USDC_USDT.address)];

    const pairs = await sdk.getPairs(pairAddresses);

    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBe(2);

    pairs.forEach((pair) => {
      expect(pair).toBeDefined();
      expect(pair.getPairMetadata()).toBeDefined();
    });

    const solUsdcPair = pairs.find((p) => p.getPairMetadata().pair.toString() === POOLS.SOL_USDC.address);
    const usdcUsdtPair = pairs.find((p) => p.getPairMetadata().pair.toString() === POOLS.USDC_USDT.address);

    expect(solUsdcPair).toBeDefined();
    expect(usdcUsdtPair).toBeDefined();
  });
});

describe('Fee Normalization', () => {
  // Run for all FEE_TEST_POOLS
  Object.entries(FEE_TEST_POOLS).forEach(([poolName, poolConfig]) => {
    it(`correctly calculates fees for ${poolName.toLowerCase().replace(/_/g, ' ')} pool (${poolConfig.address})`, async () => {
      const pair = await sdk.getPair(new PublicKey(poolConfig.address));
      const metadata = pair.getPairMetadata();

      // Verify pool configuration
      expect(metadata.binStep).toEqual(poolConfig.expectedBinStep);

      // Verify base fee is exactly as expected
      expect(metadata.baseFee).toEqual(poolConfig.expectedBaseFee);

      // Verify dynamic fee is at least the base fee (can increase due to volatility)
      expect(metadata.dynamicFee).toBeGreaterThanOrEqual(metadata.baseFee);
      expect(metadata.dynamicFee).toBeGreaterThanOrEqual(poolConfig.minDynamicFee);

      // Verify protocol fee is at least the minimum (20% of dynamic fee)
      expect(metadata.protocolFee).toBeGreaterThanOrEqual(poolConfig.minProtocolFee);

      // Ensure protocol fee is reasonable (should be close to 20% of dynamic fee)
      const expectedProtocolFee = metadata.dynamicFee * 0.2;
      expect(metadata.protocolFee).toBeCloseTo(expectedProtocolFee, 2);
    });
  });
});
