import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SarosDLMM } from '../../services';
import { Keypair, PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../constants';
import {
  IntegrationTestSetup,
  setupIntegrationTest,
  createTestKeypair,
  waitForConfirmation,
  cleanupLiquidity,
  getTokenBalance,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';
import { SarosDLMMPair } from '../../services/pair';

let testSetup: IntegrationTestSetup;
let sdk: SarosDLMM;
let pair: SarosDLMMPair;
let positionKeypair: Keypair;
let baseMint: PublicKey;
let quoteMint: PublicKey;

beforeAll(async () => {
  await ensureTestEnvironment();
  testSetup = setupIntegrationTest();
  sdk = new SarosDLMM({ mode: MODE.DEVNET, connection: testSetup.connection });

  const { testWallet, connection, testPool } = testSetup;
  const pairAddress = new PublicKey(testPool.pair);

  pair = await sdk.getPair(pairAddress);
  positionKeypair = createTestKeypair();

  baseMint = new PublicKey(testPool.tokenX);
  quoteMint = new PublicKey(testPool.tokenY);

  // Create large position for multiple swaps
  const createTx = await pair.createPosition({
    binRange: [-10, 10],
    payer: testWallet.keypair.publicKey,
    positionMint: positionKeypair.publicKey,
  });
  await waitForConfirmation(
    await connection.sendTransaction(createTx, [testWallet.keypair, positionKeypair]),
    connection
  );

  // Add substantial liquidity
  const baseAmount = 100_000_000_000n; // 100 tokens
  const quoteAmount = 100_000_000n; // 100 tokens
  const addTx = await pair.addLiquidityByShape({
    positionMint: positionKeypair.publicKey,
    payer: testWallet.keypair.publicKey,
    amountTokenX: baseAmount,
    amountTokenY: quoteAmount,
    liquidityShape: LiquidityShape.Spot,
    binRange: [-10, 10],
  });
  await waitForConfirmation(await connection.sendTransaction(addTx, [testWallet.keypair]), connection);

  console.log('✅ Test position created with liquidity');
});

afterAll(async () => {
  const { testWallet, connection } = testSetup;
  await cleanupLiquidity(pair, positionKeypair, testWallet, connection);
  console.log('✅ Test position cleaned up');
});

describe('Swap Integration Tests', () => {
  describe('Exact Input Swaps', () => {
    it('performs X→Y swap with exact input', async () => {
      const { testWallet, connection } = testSetup;

      const balBeforeBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balBeforeQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const amountIn = 1_000_000_000n; // 1 token
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      const tx = await pair.swap({
        tokenIn: baseMint,
        tokenOut: quoteMint,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [testWallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balAfterQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const spentBase = balBeforeBase - balAfterBase;
      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Verify exact input amount spent
      expect(spentBase).toBe(amountIn);
      expect(gainedQuote).toBeGreaterThan(0n);
      expect(gainedQuote).toBeGreaterThanOrEqual(quote.minTokenOut);
      expect(gainedQuote).toBeLessThanOrEqual(quote.amountOut);
    });

    it('performs Y→X swap with exact input', async () => {
      const { testWallet, connection } = testSetup;

      const balBeforeBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balBeforeQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const amountIn = 1_000_000n; // 1 quote token
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      const tx = await pair.swap({
        tokenIn: quoteMint,
        tokenOut: baseMint,
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [testWallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balAfterQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

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
      const { testWallet, connection } = testSetup;

      const balBeforeBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balBeforeQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const desiredOutput = 500_000n; // Want exactly 0.5 quote tokens
      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);

      const tx = await pair.swap({
        tokenIn: baseMint,
        tokenOut: quoteMint,
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [testWallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balAfterQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const spentBase = balBeforeBase - balAfterBase;
      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Verify exact output amount received
      expect(gainedQuote).toBe(desiredOutput);
      expect(spentBase).toBeGreaterThan(0n);
    });

    it('performs Y→X swap with exact output', async () => {
      const { testWallet, connection } = testSetup;

      const balBeforeBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balBeforeQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const desiredOutput = 500_000_000n; // Want exactly 0.5 base tokens
      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: false, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);

      const tx = await pair.swap({
        tokenIn: quoteMint,
        tokenOut: baseMint,
        amount: desiredOutput,
        options: { swapForY: false, isExactInput: false },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [testWallet.keypair]), connection);

      const balAfterBase = await getTokenBalance(connection, testWallet.keypair.publicKey, baseMint);
      const balAfterQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const spentQuote = balBeforeQuote - balAfterQuote;
      const gainedBase = balAfterBase - balBeforeBase;

      // Verify exact output amount received
      expect(gainedBase).toBe(desiredOutput);
      expect(spentQuote).toBeGreaterThan(0n);
    });
  });

  describe('Quote Accuracy', () => {
    it('actual swap results match quote predictions', async () => {
      const { testWallet, connection } = testSetup;

      const balBeforeQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const amountIn = 2_000_000_000n;
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      const tx = await pair.swap({
        tokenIn: baseMint,
        tokenOut: quoteMint,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      await waitForConfirmation(await connection.sendTransaction(tx, [testWallet.keypair]), connection);

      const balAfterQuote = await getTokenBalance(connection, testWallet.keypair.publicKey, quoteMint);

      const gainedQuote = balAfterQuote - balBeforeQuote;

      // Actual output should be very close to quoted (within rounding)
      const difference = gainedQuote > quote.amountOut
        ? gainedQuote - quote.amountOut
        : quote.amountOut - gainedQuote;

      const diffPercent = Number(difference * 10000n / quote.amountOut);
      expect(diffPercent).toBeLessThan(10); // Within 0.1%
    });
  });
});
