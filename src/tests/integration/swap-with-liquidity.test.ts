import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SarosDLMM } from '../../services';
import { Keypair, PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../constants';
import {
  waitForConfirmation,
  cleanupLiquidity,
  getTokenBalance,
} from '../setup/test-util';
import { SarosDLMMPair } from '../../services/pair';

let sdk: SarosDLMM;
let pair: SarosDLMMPair;
let positionKeypair: Keypair;
let tokenX: PublicKey;
let tokenY: PublicKey;

beforeAll(async () => {
      const { wallet, pool, connection } = global.testEnv;

  sdk = new SarosDLMM({ mode: MODE.DEVNET, connection: connection });

  const pairAddress = new PublicKey(pool.pair);

  pair = await sdk.getPair(pairAddress);
  positionKeypair = Keypair.generate();

  tokenX = new PublicKey(pool.tokenX);
  tokenY = new PublicKey(pool.tokenY);

  // Create large position for multiple swaps
  const createTx = await pair.createPosition({
    binRange: [-5, 5],
    payer: wallet.keypair.publicKey,
    positionMint: positionKeypair.publicKey,
  });
  await waitForConfirmation(
    await connection.sendTransaction(createTx, [wallet.keypair, positionKeypair]),
    connection
  );

  // Add substantial liquidity
  const baseAmount  = 100_000_000_000_000n; // 100,000 tokens (9 decimals)
  const quoteAmount = 100_000_000n; // .1 tokens
  const addTx = await pair.addLiquidityByShape({
    positionMint: positionKeypair.publicKey,
    payer: wallet.keypair.publicKey,
    amountTokenX: baseAmount,
    amountTokenY: quoteAmount,
    liquidityShape: LiquidityShape.Spot,
    binRange: [-5, 5],
  });
  await waitForConfirmation(await connection.sendTransaction(addTx, [wallet.keypair]), connection);

  console.log('✅ Test position created with liquidity');
});

afterAll(async () => {
    const { wallet, connection } = global.testEnv;
  await cleanupLiquidity(pair, positionKeypair, wallet, connection);
  console.log('✅ Test position cleaned up');
});

describe('Swap Integration Tests', () => {
  describe('Exact Input Swaps', () => {
    it('performs X→Y swap with exact input', async () => {
    const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const amountIn = 1_000_000_000n; // 1 token
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      const tx = await pair.swap({
        tokenIn: tokenX,
        tokenOut: tokenY,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [wallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const spentBase = balBeforeBase - balAfterBase;
      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Verify exact input amount spent
      expect(spentBase).toBe(amountIn);
      expect(gainedQuote).toBeGreaterThan(0n);
      expect(gainedQuote).toBeGreaterThanOrEqual(quote.minTokenOut);
      expect(gainedQuote).toBeLessThanOrEqual(quote.amountOut);
    });

    it('performs Y→X swap with exact input', async () => {
    const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const amountIn = 1_000_000n; // 1 quote token
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      const tx = await pair.swap({
        tokenIn: tokenY,
        tokenOut: tokenX,
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [wallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const spentQuote = balBeforeQuote - balAfterQuote;
      const gainedBase = balAfterBase - balBeforeBase;

      // Verify exact input amount spent
      expect(spentQuote).toBe(amountIn);
      expect(gainedBase).toBeGreaterThan(0n);
      expect(gainedBase).toBeGreaterThanOrEqual(quote.minTokenOut);
    });
  });

  describe('Exact Output Swaps', () => {
    it('performs X→Y swap with exact output', async () => {
    const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const desiredOutput = 500_000n; // Want exactly 0.5 quote tokens
      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);

      const tx = await pair.swap({
        tokenIn: tokenX,
        tokenOut: tokenY,
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [wallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const spentBase = balBeforeBase - balAfterBase;
      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Verify exact output amount received
      expect(gainedQuote).toBe(desiredOutput);
      expect(spentBase).toBeGreaterThan(0n);
    });

    it('performs Y→X swap with exact output', async () => {
    const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const desiredOutput = 500_000_000n; // Want exactly 0.5 base tokens
      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: false, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);

      const tx = await pair.swap({
        tokenIn: tokenY,
        tokenOut: tokenX,
        amount: desiredOutput,
        options: { swapForY: false, isExactInput: false },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [wallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const spentQuote = balBeforeQuote - balAfterQuote;
      const gainedBase = balAfterBase - balBeforeBase;

      // Verify exact output amount received
      expect(gainedBase).toBe(desiredOutput);
      expect(spentQuote).toBeGreaterThan(0n);
    });
  });

  describe('Quote Accuracy', () => {
    it('actual swap results match quote predictions', async () => {
    const { wallet, connection } = global.testEnv;

      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const amountIn = 2_000_000_000n;
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      const tx = await pair.swap({
        tokenIn: tokenX,
        tokenOut: tokenY,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [wallet.keypair]), connection);

      const balAfterQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Actual output should be very close to quoted (within rounding)
      const difference = gainedQuote > quote.amountOut ? gainedQuote - quote.amountOut : quote.amountOut - gainedQuote;

      const diffPercent = Number((difference * 10000n) / quote.amountOut);
      expect(diffPercent).toBeLessThan(10); // Within 0.1%
    });
  });
});
