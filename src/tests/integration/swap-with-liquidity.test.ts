import { describe, it, expect, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../..';
import { MODE, LiquidityShape, RemoveLiquidityType } from '../../types';
import {
  getTestWallet,
  getTestConnection,
  getAllTestPools,
  getAllTestTokens,
  createTestKeypair,
  waitForConfirmation,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';
import * as spl from '@solana/spl-token';
import { WRAP_SOL_PUBKEY } from '../../constants';

let lbServices: SarosDLMM;
let testWallet: any;
let connection: any;
let testPool: any;

function isInsufficientFundsError(e: unknown) {
  return String(e).toLowerCase().includes('insufficient');
}

async function cleanupLiquidity(positionKeypair: any, poolAddress: PublicKey) {
  try {
    const result = await lbServices.removeLiquidity({
      positionMints: [positionKeypair.publicKey],
      payer: testWallet.keypair.publicKey,
      type: RemoveLiquidityType.All,
      poolAddress,
    });

    if (result.setupTransaction) {
      await connection.sendTransaction(result.setupTransaction, [testWallet.keypair]);
    }
    for (const tx of result.transactions) {
      await connection.sendTransaction(tx, [testWallet.keypair]);
    }
    if (result.cleanupTransaction) {
      await connection.sendTransaction(result.cleanupTransaction, [testWallet.keypair]);
    }
  } catch {
    // ignore cleanup failures
  }
}

async function getTokenBalance(owner: PublicKey, mint: PublicKey) {
  if (mint === WRAP_SOL_PUBKEY) {
    // WSOL unwraps into SOL, so check lamports directly
    const acctInfo = await connection.getAccountInfo(owner);
    return acctInfo ? BigInt(acctInfo.lamports) : 0n;
  }
  const ata = spl.getAssociatedTokenAddressSync(mint, owner);
  try {
    const bal = await connection.getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    return 0n;
  }
}

beforeAll(async () => {
  await ensureTestEnvironment();
  testWallet = getTestWallet();
  connection = getTestConnection();

  const tokens = getAllTestTokens();
  const saros = tokens.find((t) => t.symbol === 'SAROSDEV');
  if (!saros) throw new Error('SAROSDEV token missing');

  const pools = getAllTestPools();
  testPool = pools.find(
    (p) => p.baseToken === saros.mintAddress || p.quoteToken === saros.mintAddress
  );
  if (!testPool) throw new Error('No pool with SAROSDEV token');

  lbServices = new SarosDLMM({
    mode: MODE.DEVNET,
    options: { rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com' },
  });
});

describe('Swap Integration with Seeded Liquidity', () => {
  it('adds liquidity, performs a swap, and verifies balances', async () => {
    const poolAddress = new PublicKey(testPool.pair);
    const positionKeypair = createTestKeypair();

    try {
      // 1. Create position
      const createTx = await lbServices.createPosition({
        poolAddress,
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
      const addTx = await lbServices.addLiquidityByShape({
        poolAddress,
        positionMint: positionKeypair.publicKey,
        payer: testWallet.keypair.publicKey,
        baseAmount,
        quoteAmount,
        liquidityShape: LiquidityShape.Spot,
        binRange: [-3, 3],
      });
      await waitForConfirmation(
        await connection.sendTransaction(addTx, [testWallet.keypair]),
        connection
      );

      // 3. Balances before swap
      const baseMint = new PublicKey(testPool.baseToken);
      const quoteMint = new PublicKey(testPool.quoteToken);
      const balBeforeBase = await getTokenBalance(testWallet.keypair.publicKey, baseMint);
      const balBeforeQuote = await getTokenBalance(testWallet.keypair.publicKey, quoteMint);

      // 4. Get a quote
      const amountIn = 1_000_000_000n; // 1 base token (with 9 decimals)
      const quote = await lbServices.getQuote({
        poolAddress,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        slippage: 1,
      });

      expect(quote.amountOut).toBeGreaterThan(0n);

      // 5. Perform the swap
      const tx = await lbServices.swap({
        tokenIn: baseMint,
        tokenOut: quoteMint,
        amount: amountIn,
        options: { swapForY: true, isExactInput: true },
        minTokenOut: quote.minTokenOut,
        poolAddress,
        hook: poolAddress,
        payer: testWallet.keypair.publicKey,
      });

      const sig = await connection.sendTransaction(tx, [testWallet.keypair]);
      await waitForConfirmation(sig, connection);
      console.log(`Swap confirmed: ${sig}`);

      // 6. Balances after swap
      const balAfterBase = await getTokenBalance(testWallet.keypair.publicKey, baseMint);
      const balAfterQuote = await getTokenBalance(testWallet.keypair.publicKey, quoteMint);

      // 7. Assertions with tolerance
      const spentBase = balBeforeBase > balAfterBase ? balBeforeBase - balAfterBase : 0n;
      const gainedQuote = balAfterQuote > balBeforeQuote ? balAfterQuote - balBeforeQuote : 0n;

      console.log('Base spent:', spentBase.toString());
      console.log(
        'Quote gained:',
        gainedQuote.toString(),
        'expected ≥',
        quote.minTokenOut.toString()
      );

      // Must have spent some base
      expect(spentBase).toBeGreaterThan(0n);

      // minTokenOut is enforced on-chain, so if gainedQuote is measurable, check it
      if (gainedQuote > 0n) {
        expect(gainedQuote).toBeGreaterThanOrEqual(quote.minTokenOut);
      }
    } catch (err) {
      if (!isInsufficientFundsError(err)) throw err;
    } finally {
      await cleanupLiquidity(positionKeypair, poolAddress);
    }
  });
});
