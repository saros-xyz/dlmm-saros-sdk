import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SarosDLMM } from '../../services';
import { Keypair, PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../constants';
import { waitForConfirmation, cleanupLiquidity, getTokenBalance, getWsolAccountRent } from '../setup/test-util';
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
  await waitForConfirmation(await connection.sendTransaction(createTx, [wallet.keypair, positionKeypair]), connection);

  // Add substantial liquidity balanced with ratePrice 0.000002
  const baseAmount = 100_000_000_000_000n; // 100,000 SAROSDEV (9 decimals)
  const quoteAmount = 200_000_000n; // 0.2 SOL (9 decimals) - balanced with ratePrice 0.000002
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
      // Exact input: Spend exactly amountIn of tokenX, receive variable amountOut of tokenY (SOL)
      // Measure native SOL balance and account for wSOL rent returned when account closes
      const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await connection.getBalance(wallet.keypair.publicKey);
      const wsolAccountRent = await getWsolAccountRent(connection);

      const amountIn = 1_000_000_000n; // 1 SAROSDEV
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      // Quote validation
      expect(quote.amountIn).toBe(amountIn);
      expect(quote.amountOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeLessThanOrEqual(quote.amountOut);

      const tx = await pair.swap({
        tokenIn: tokenX,
        tokenOut: tokenY,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      const sig = await connection.sendTransaction(tx, [wallet.keypair]);
      await waitForConfirmation(sig, connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await connection.getBalance(wallet.keypair.publicKey);

      // Get transaction fee to account for it
      const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      const txFee = BigInt(txInfo?.meta?.fee || 0);

      const spentBase = balBeforeBase - balAfterBase;
      const totalGained = BigInt(balAfterQuote) - BigInt(balBeforeQuote) + txFee;

      // Subtract wSOL account rent to get actual swap output
      const gainedQuote = totalGained - wsolAccountRent;

      // Exact input: must spend exactly amountIn
      expect(spentBase).toBe(amountIn);
      // Output must meet slippage protection
      expect(gainedQuote).toBeGreaterThan(0n);
      expect(gainedQuote).toBeGreaterThanOrEqual(quote.minTokenOut);
      // Output should be close to quote (allowing for small variance)
      expect(gainedQuote).toBeLessThanOrEqual(quote.amountOut);
    });

    it('performs Y→X swap with exact input', async () => {
      // Exact input: Spend exactly amountIn of tokenY (SOL), receive variable amountOut of tokenX
      // When spending SOL, a wSOL account is created (costs rent), then closed (rent returned)
      const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await connection.getBalance(wallet.keypair.publicKey);
      const wsolAccountRent = await getWsolAccountRent(connection);

      const amountIn = 1_000_000n; // 0.001 SOL
      const quote = await pair.getQuote({
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        slippage: 1,
      });

      // Quote validation
      expect(quote.amountIn).toBe(amountIn);
      expect(quote.amountOut).toBeGreaterThan(0n);
      expect(quote.minTokenOut).toBeLessThanOrEqual(quote.amountOut);

      const tx = await pair.swap({
        tokenIn: tokenY,
        tokenOut: tokenX,
        amount: amountIn,
        options: { swapForY: false, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      const sig = await connection.sendTransaction(tx, [wallet.keypair]);
      await waitForConfirmation(sig, connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await connection.getBalance(wallet.keypair.publicKey);

      // Get transaction fee
      const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      const txFee = BigInt(txInfo?.meta?.fee || 0);

      const gainedBase = balAfterBase - balBeforeBase;
      const totalSpent = BigInt(balBeforeQuote) - BigInt(balAfterQuote) - txFee;

      // Subtract wSOL rent (created then closed, net zero but shows in spent)
      const spentQuote = totalSpent - wsolAccountRent;

      // Exact input: must spend exactly amountIn (after accounting for wSOL rent)
      expect(spentQuote).toBe(amountIn);
      // Output must meet slippage protection
      expect(gainedBase).toBeGreaterThan(0n);
      expect(gainedBase).toBeGreaterThanOrEqual(quote.minTokenOut);
      // Output should be close to quote (allowing for small variance)
      expect(gainedBase).toBeLessThanOrEqual(quote.amountOut);
    });
  });

  describe('Exact Output Swaps', () => {
    it('performs X→Y swap with exact output', async () => {
      // Exact output: Receive exactly desiredOutput of tokenY (SOL), spend variable amount of tokenX
      // Measure native SOL balance and account for wSOL rent returned when account closes
      const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await connection.getBalance(wallet.keypair.publicKey);
      const wsolAccountRent = await getWsolAccountRent(connection);

      const desiredOutput = 1_000n; // Want exactly 1,000 lamports of SOL
      const quote = await pair.getQuote({
        amount: desiredOutput,
        options: { swapForY: true, isExactInput: false },
        slippage: 1,
      });

      expect(quote.amountOut).toBe(desiredOutput);

      const tx = await pair.swap({
        tokenIn: tokenX,
        tokenOut: tokenY,
        amount: quote.amountOut,
        options: { swapForY: true, isExactInput: false },
        minTokenOut: quote.minTokenOut,
        payer: wallet.keypair.publicKey,
      });

      const sig = await connection.sendTransaction(tx, [wallet.keypair]);
      await waitForConfirmation(sig, connection);

      const balAfterBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balAfterQuote = await connection.getBalance(wallet.keypair.publicKey);

      // Get transaction fee
      const txInfo = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      const txFee = BigInt(txInfo?.meta?.fee || 0);

      const spentBase = balBeforeBase - balAfterBase;
      const totalGained = BigInt(balAfterQuote) - BigInt(balBeforeQuote) + txFee;
      const gainedQuote = totalGained - wsolAccountRent;

      // Verify exact output amount received
      expect(gainedQuote).toBe(desiredOutput);
      expect(spentBase).toBeGreaterThan(0n);
      // Input should not exceed max input (with slippage)
      expect(spentBase).toBeLessThanOrEqual(quote.amountIn);
    });

    it('performs Y→X swap with exact output', async () => {
      const { wallet, connection } = global.testEnv;

      const balBeforeBase = await getTokenBalance(connection, wallet.keypair.publicKey, tokenX);
      const balBeforeQuote = await getTokenBalance(connection, wallet.keypair.publicKey, tokenY);

      const desiredOutput = 100_000_000n; // Want exactly 0.1 base tokens
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
});
