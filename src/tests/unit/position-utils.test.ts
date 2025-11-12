import { describe, expect, it } from 'vitest';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';

// Single connection + SDK instance for all tests
const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

const USDC_USDT = '9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk';

describe('Position Operations', () => {
  // it('fetches user positions for pool', async () => {
  // any wallet with a DLMM position open
  // const TEST_WALLET = new PublicKey('4VGLP8wqFEHEoh8vjgYCMsUbZ6LtuYrxcJv226qCWNuT');

  //   const pair = await sdk.getPair(new PublicKey(USDC_USDT));
  //   const positions = await pair.getUserPositions({
  //     payer: TEST_WALLET,
  //   });

  //   expect(Array.isArray(positions)).toBe(true);
  //   expect(positions.length).toBeGreaterThan(0);

  //   positions.forEach((position) => {
  //     expect(position.upperBinId).toBeGreaterThanOrEqual(position.lowerBinId);
  //   });
  // });

  it('handles wallet with no positions', async () => {
    const pair = await sdk.getPair(new PublicKey(USDC_USDT));
    const positions = await pair.getUserPositions({
      payer: Keypair.generate().publicKey,
    });

    expect(positions).toEqual([]);
  });
});
