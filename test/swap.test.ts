import { PublicKey } from '@solana/web3.js';
import { describe, it, expect } from 'vitest';
import { LiquidityBookServices } from '../services';
import { MODE } from '../types';

const lbServices = new LiquidityBookServices({
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
      swapForY: true,
      isExactInput: true,
      tokenBase: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      tokenBaseDecimal: 6,
      tokenQuote: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
      tokenQuoteDecimal: 6,
      slippage: 10,
    });

    expect(typeof quote.amountIn).toBe('bigint');
    expect(typeof quote.amountOut).toBe('bigint');
    expect(quote.amountIn).toBeGreaterThan(0n);
  });
});
