import { Connection, PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';
import { SarosSDK } from '../services';
import { MODE } from '../constants';

const sdk = new SarosSDK({
  mode: MODE.MAINNET,
  connection: new Connection('https://api.mainnet-beta.solana.com'),
});

describe('DLMMPair Metadata', () => {
  it('should fetch and validate metadata for USDC/USDT pair with correct fees', async () => {
    const pairAddress = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'); // USDC/USDT

    const pair = await sdk.getPair(pairAddress);
    const metadata = pair.getPairMetadata();

    console.log('Pair Metadata:', metadata);

    // Validate structure
    expect(metadata).toBeDefined();
    expect(metadata.pair.toString()).toBe(pairAddress.toString());

    // Validate tokenX and tokenY
    expect(metadata.tokenX).toBeDefined();
    expect(metadata.tokenX.mintAddress).toBeTruthy();
    expect(metadata.tokenX.decimal).toBeGreaterThan(0);
    expect(metadata.tokenX.reserve).toBeTruthy();

    expect(metadata.tokenY).toBeDefined();
    expect(metadata.tokenY.mintAddress).toBeTruthy();
    expect(metadata.tokenY.decimal).toBeGreaterThan(0);
    expect(metadata.tokenY.reserve).toBeTruthy();

    // Tokens should be different
    expect(metadata.tokenX.mintAddress.toString()).not.toBe(metadata.tokenY.mintAddress.toString());

    // Validate fees (binStep = 1)
    expect(metadata.binStep).toBe(1);
    expect(metadata.baseFee).toBeCloseTo(0.01, 4); // Base fee: 0.01%
    expect(metadata.dynamicFee).toBeGreaterThanOrEqual(0); // Current dynamic fee (snapshot from volatility accumulator)
    expect(metadata.protocolFee).toBeCloseTo(0.002, 4); // Protocol fee: 0.002% (20% of base fee)

    // Validate hook (optional)
    expect(metadata.extra).toBeDefined();
    if (metadata.extra.hook) {
      expect(typeof metadata.extra.hook).toBe('string');
    }
  });
});
