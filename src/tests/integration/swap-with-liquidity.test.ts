import { describe, it, expect, beforeAll } from 'vitest';
import { SarosDLMM } from '../../services';
import { PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../types';
import {
  IntegrationTestSetup,
  setupIntegrationTest,
  createTestKeypair,
  waitForConfirmation,
  cleanupLiquidity,
  getTokenBalance,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';

let testSetup: IntegrationTestSetup;
let sdk: SarosDLMM;

beforeAll(async () => {
  await ensureTestEnvironment();
  testSetup = setupIntegrationTest();
  sdk = new SarosDLMM({ mode: MODE.DEVNET, connection: testSetup.connection });
});

describe('Swap Integration with Seeded Liquidity', () => {
  it('adds liquidity, performs a swap, and verifies balances', async () => {
    const { testWallet, connection, testPool } = testSetup;
    const pairAddress = new PublicKey(testPool.pair);

    // ✅ new instance usage
    const pair = await sdk.getPair(pairAddress);
    const positionKeypair = createTestKeypair();

    try {
      // 1. Create position
      const createTx = await pair.createPosition({
        binRange: [-3, 3],
        payer: testWallet.keypair.publicKey,
        positionMint: positionKeypair.publicKey,
      });
      await waitForConfirmation(
        await connection.sendTransaction(createTx, [testWallet.keypair, positionKeypair]),
        connection
      );

      // 2. Add liquidity
      const baseAmount = 20_000_000_000n;
      const quoteAmount = 20_000_000n;
      const addTx = await pair.addLiquidityByShape({
        positionMint: positionKeypair.publicKey,
        payer: testWallet.keypair.publicKey,
        amountTokenX: baseAmount,
        amountTokenY: quoteAmount,
        liquidityShape: LiquidityShape.Spot,
        binRange: [-3, 3],
      });
      await waitForConfirmation(
        await connection.sendTransaction(addTx, [testWallet.keypair]),
        connection
      );

      // 3. Balances before swap
      const baseMint = new PublicKey(testPool.tokenX);
      const quoteMint = new PublicKey(testPool.tokenY);
      const balBeforeBase = await getTokenBalance(
        connection,
        testWallet.keypair.publicKey,
        baseMint
      );
      const balBeforeQuote = await getTokenBalance(
        connection,
        testWallet.keypair.publicKey,
        quoteMint
      );

      // 4. Get a quote
      const amountIn = 1_000_000_000n; // 1 base token (9 decimals)
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      // 5. Perform the swap
      const tx = await pair.swap({
        tokenIn: baseMint,
        tokenOut: quoteMint,
        amount: amountIn, // Use the input amount for exact-in swap
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: testWallet.keypair.publicKey,
      });

      const sig = await connection.sendTransaction(tx, [testWallet.keypair]);
      await waitForConfirmation(sig, connection);
      console.log(`Swap confirmed: ${sig}`);

      // 6. Balances after swap
      const balAfterBase = await getTokenBalance(
        connection,
        testWallet.keypair.publicKey,
        baseMint
      );
      const balAfterQuote = await getTokenBalance(
        connection,
        testWallet.keypair.publicKey,
        quoteMint
      );

      // 7. Calculate actual changes
      const spentBase = balBeforeBase - balAfterBase;
      const gainedQuote = balAfterQuote - balBeforeQuote;
      console.log(`Balance changes: spent ${spentBase} base, gained ${gainedQuote} quote`);

      // 8. Assertions
      expect(spentBase).toBeGreaterThan(0n);
      expect(gainedQuote).toBeGreaterThan(0n);
      expect(gainedQuote).toBeGreaterThanOrEqual(quote.minTokenOut);
    } finally {
      await cleanupLiquidity(pair, positionKeypair, testWallet, connection);
    }
  });
});
