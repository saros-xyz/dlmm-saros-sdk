import { describe, expect, it } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { MODE } from '../../types';
import { SarosDLMMError } from '../../utils/errors';
import { SarosDLMM } from '../../services';

// Single connection + SDK instance for all tests
const connection = new Connection(
  process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

// Test constants
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
    await expect(sdk.getPair(new PublicKey(POOLS.INVALID.address))).rejects.toThrow(
      SarosDLMMError.PairFetchFailed
    );
  });
});

describe('Pool Discovery', () => {
  it('returns array of pool addresses', async () => {
    const addresses = await sdk.getAllPairAddresses();

    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0]).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 format
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
    const pairAddresses = [
      new PublicKey(POOLS.SOL_USDC.address),
      new PublicKey(POOLS.USDC_USDT.address),
    ];

    const pairs = await sdk.getPairs(pairAddresses);

    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBe(2);

    pairs.forEach((pair) => {
      expect(pair).toBeDefined();
      expect(pair.getPairMetadata()).toBeDefined();
    });

    const solUsdcPair = pairs.find(
      (p) => p.getPairMetadata().pair.toString() === POOLS.SOL_USDC.address
    );
    const usdcUsdtPair = pairs.find(
      (p) => p.getPairMetadata().pair.toString() === POOLS.USDC_USDT.address
    );

    expect(solUsdcPair).toBeDefined();
    expect(usdcUsdtPair).toBeDefined();
  });
});

describe('Fee Normalization', () => {
  it('normalizes fees for pair 7LxJjKPdpQ4tRrpDTQgBdxyjG7Ve4GUE6ZMo8W98qn5Z', async () => {
    const pair = await sdk.getPair(new PublicKey('7LxJjKPdpQ4tRrpDTQgBdxyjG7Ve4GUE6ZMo8W98qn5Z'));
    const metadata = pair.getPairMetadata();

    expect(metadata.binStep).toEqual(100);
    expect(metadata.baseFee).toEqual(1); // fixed base fee
    expect(metadata.protocolFee).toEqual(0.2); // fixed % of base
    expect(metadata.dynamicFee).toBeGreaterThanOrEqual(1); // can only increase
  });

  it('normalizes fees for pair 7hc6hXjDPcFnhGBPBGTKUtViFsQuyWw8ph4ePHF1aTYG', async () => {
    const pair = await sdk.getPair(new PublicKey('7hc6hXjDPcFnhGBPBGTKUtViFsQuyWw8ph4ePHF1aTYG'));
    const metadata = pair.getPairMetadata();

    expect(metadata.binStep).toEqual(1);
    expect(metadata.baseFee).toEqual(0.01); // fixed base fee
    expect(metadata.protocolFee).toEqual(0.002); // fixed % of base
    expect(metadata.dynamicFee).toBeGreaterThanOrEqual(0.01);
  });

  it('normalizes fees for pair EBe9p6UWqE6SJDhZu87pbZ4wPwce92ubTJNV6ijU6vCc', async () => {
    const pair = await sdk.getPair(new PublicKey('EBe9p6UWqE6SJDhZu87pbZ4wPwce92ubTJNV6ijU6vCc'));
    const metadata = pair.getPairMetadata();

    expect(metadata.binStep).toEqual(100);
    expect(metadata.baseFee).toEqual(1);
    expect(metadata.protocolFee).toEqual(0.2);
    expect(metadata.dynamicFee).toBeGreaterThanOrEqual(1);
  });
});
