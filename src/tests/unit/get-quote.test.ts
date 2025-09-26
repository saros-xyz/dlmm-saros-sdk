import { PublicKey, Connection } from '@solana/web3.js';
import { describe, it, expect } from 'vitest';
import { SarosDLMM } from '../../services';
import { MODE } from '../../types';

describe('getQuote with bigint support', () => {
  it('should handle large token amounts without precision loss', async () => {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

    const largeAmount = 1_000_000n; // 1 token with 6 decimals
    const pairAddress = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');

    const pair = await sdk.getPair(pairAddress);

    const quote = await pair.getQuote({
      amount: largeAmount,
      options: { swapForY: true, isExactInput: true },
      slippage: 10,
    });

    expect(typeof quote.amountIn).toBe('bigint');
    expect(typeof quote.amountOut).toBe('bigint');
    expect(quote.amountIn).toBeGreaterThan(0n);
  });
});
