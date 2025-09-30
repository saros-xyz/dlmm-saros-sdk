import { describe, expect, it } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';

const connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const sdk = new SarosDLMM({ mode: MODE.MAINNET, connection });

// Popular mainnet pools with deep liquidity
const USDC_USDT = new PublicKey('9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk'); // Stablecoin pair
const USDS_USDC = new PublicKey('DHXKB9fSff4LjubMFieKxaBrvNY6AzXVwaRLk5N2vs87'); // Stablecoin pair
const UNIBTC_XBTC = new PublicKey('7hc6hXjDPcFnhGBPBGTKUtViFsQuyWw8ph4ePHF1aTYG'); // BTC LST pair


describe('Quote Validation (Mainnet)', () => {
  describe('getQuote - exact input swaps', () => {
    it('returns valid quote for small X→Y swap', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const amountIn = 1_000_000n; // 1 USDC (6 decimals)

      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeLessThanOrEqual(quote.amountOut);
    });

    it('returns valid quote for small Y→X swap', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const amountIn = 1_000_000n; // 1 USDT (6 decimals)

      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeLessThanOrEqual(quote.amountOut);
    });

    it('larger swaps have proportionally larger output', async () => {
      const pair = await sdk.getPair(USDC_USDT);

      const smallAmount = 1_000_000n; // 1 USDC
      const largeAmount = 10_000_000n; // 10 USDC

      const smallQuote = await pair.getQuote({
        amount: smallAmount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      const largeQuote = await pair.getQuote({
        amount: largeAmount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // Large swap should give more output
      expect(largeQuote.amountOut).toBeGreaterThan(smallQuote.amountOut);

      // For stablecoins with deep liquidity, ratio should be very close to 10x
      const ratio = Number(largeQuote.amountOut) / Number(smallQuote.amountOut);
      expect(ratio).toBeGreaterThan(9.5); // Should be close to 10x
      expect(ratio).toBeLessThanOrEqual(10.01); // Allow tiny rounding error
    });
  });

  describe('getQuote - exact output swaps', () => {
    it('returns valid quote for exact output X→Y', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const desiredOutput = 1_000_000n; // Want 1 USDT out

      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);
      expect(quote.minTokenOut).toBe(desiredOutput);
    });

    it('returns valid quote for exact output Y→X', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const desiredOutput = 1_000_000n; // Want 1 USDC out

      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: false, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);
      expect(quote.minTokenOut).toBe(desiredOutput);
    });
  });

  describe('slippage tolerance', () => {
    it('higher slippage results in lower minTokenOut', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const amountIn = 10_000_000n; // 10 USDC

      const quote1pct = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      const quote5pct = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 5,
      });

      // Both should give same amountOut estimate
      expect(quote1pct.amountOut).toBe(quote5pct.amountOut);

      // But 5% slippage allows more deviation
      expect(quote5pct.minTokenOut).toBeLessThan(quote1pct.minTokenOut);

      // Verify slippage calculation
      const slippage1 = Number((quote1pct.amountOut - quote1pct.minTokenOut) * 10000n / quote1pct.amountOut);
      const slippage5 = Number((quote5pct.amountOut - quote5pct.minTokenOut) * 10000n / quote5pct.amountOut);

      expect(slippage1).toBeCloseTo(100, 1); // ~1% (100 basis points)
      expect(slippage5).toBeCloseTo(500, 1); // ~5% (500 basis points)
    });
  });

  describe('quote symmetry', () => {
    it('swapping back should return approximately original amount', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const startAmount = 10_000_000n; // 10 USDC

      // Quote X→Y
      const quoteXtoY = await pair.getQuote({
        amount: startAmount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // Quote Y→X using the output from first swap
      const quoteYtoX = await pair.getQuote({
        amount: quoteXtoY.amountOut,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      // Should get back close to original (minus fees and slippage)
      const returnAmount = quoteYtoX.amountOut;
      const lossPercentage = Number((startAmount - returnAmount) * 10000n / startAmount);

      // Loss should be small (fees + 2x price impact)
      expect(lossPercentage).toBeLessThan(200); // Less than 2%
      expect(returnAmount).toBeLessThan(startAmount); // Should lose some to fees
    });
  });

  describe('stablecoin swap accuracy', () => {
    it('$5000 USDC→USDT swap returns close to $5000 worth', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const amount = 5_000_000_000n; // 5000 USDC (6 decimals)

      const quote = await pair.getQuote({
        amount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // For stablecoins, output should be very close to input
      const amountInFloat = Number(amount) / 1_000_000;
      const amountOutFloat = Number(quote.amountOut) / 1_000_000;

      // Less than 0.5% deviation (stablecoins should be ~1:1)
      const deviation = Math.abs(amountOutFloat - amountInFloat) / amountInFloat;
      expect(deviation).toBeLessThan(0.005);

      // Should get at least $4975 worth (0.5% slippage)
      expect(amountOutFloat).toBeGreaterThan(4975);
    });

    it('$5000 USDS→USDC swap returns close to $5000 worth', async () => {
      const pair = await sdk.getPair(USDS_USDC);
      const amount = 5_000_000_000n; // 5000 USDS (6 decimals)

      const quote = await pair.getQuote({
        amount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      const amountInFloat = Number(amount) / 1_000_000;
      const amountOutFloat = Number(quote.amountOut) / 1_000_000;

      // Less than 0.5% deviation
      const deviation = Math.abs(amountOutFloat - amountInFloat) / amountInFloat;
      expect(deviation).toBeLessThan(0.005);
      expect(amountOutFloat).toBeGreaterThan(4975);
    });

    it('validates stablecoin round-trip maintains value', async () => {
      const pair = await sdk.getPair(USDC_USDT);
      const startAmount = 1_000_000_000n; // 1000 USDC

      // USDC → USDT
      const quoteForward = await pair.getQuote({
        amount: startAmount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // USDT → USDC
      const quoteBack = await pair.getQuote({
        amount: quoteForward.amountOut,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      const startFloat = Number(startAmount) / 1_000_000;
      const endFloat = Number(quoteBack.amountOut) / 1_000_000;

      // Should lose less than 1% in round trip (2x fees + slippage)
      const loss = (startFloat - endFloat) / startFloat;
      expect(loss).toBeLessThan(0.01);
    });
  });

  describe('BTC LST swap validation', () => {
    it('0.1 BTC swap maintains reasonable ratio', async () => {
      const pair = await sdk.getPair(UNIBTC_XBTC);
      const amount = 10_000_000n; // 0.1 BTC (8 decimals)

      const quote = await pair.getQuote({
        amount,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // BTC LSTs should trade close to 1:1
      const amountInFloat = Number(amount) / 100_000_000;
      const amountOutFloat = Number(quote.amountOut) / 100_000_000;

      // Less than 1% deviation for BTC LSTs
      const deviation = Math.abs(amountOutFloat - amountInFloat) / amountInFloat;
      expect(deviation).toBeLessThan(0.01);
    });
  });

  describe('edge cases', () => {
    it('handles zero amount gracefully', async () => {
      const pair = await sdk.getPair(USDC_USDT);

      await expect(
        pair.getQuote({
          amount: 0n,
          options: { swapForY: true, isExactInput: true },
          slippage: 1,
        })
      ).rejects.toThrow();
    });
  });
});