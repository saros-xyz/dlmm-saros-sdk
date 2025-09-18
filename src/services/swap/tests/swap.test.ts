import { PublicKey } from '@solana/web3.js';
import { describe, it, expect } from 'vitest';
import { SarosDLMM } from '../..';
import { MODE } from '../../../types';

const lbServices = new SarosDLMM({
  mode: MODE.MAINNET,
  options: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
});

describe('getQuote with bigint support', () => {
  it('should handle large token amounts without precision loss', async () => {
    const largeAmount = BigInt('1000000'); // 1 token with 6 decimals

    const quote = await lbServices.getQuote({
      amount: largeAmount,
      pair: new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'),
      options: { swapForY: true, isExactInput: true },
      slippage: 10,
    });

    expect(typeof quote.amountIn).toBe('bigint');
    expect(typeof quote.amountOut).toBe('bigint');
    expect(quote.amountIn).toBeGreaterThan(0n);
  });
});
