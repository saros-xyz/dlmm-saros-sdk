import { PublicKey } from '@solana/web3.js';
import { describe, it, expect } from 'vitest';
import { SarosDLMM } from '../../services';
import { MODE } from '../../types';

const config = {
  mode: MODE.MAINNET,
  options: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
};

describe('getQuote with bigint support', () => {
  it('should handle large token amounts without precision loss', async () => {
    const largeAmount = BigInt('1000000'); // 1 token with 6 decimals
    const pairAddress = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk');

    // Create pair instance with cached data
    const pair = await SarosDLMM.createPair(config, pairAddress);

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
