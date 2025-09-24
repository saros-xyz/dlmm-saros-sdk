import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE, RemoveLiquidityType, SarosDLMM } from '../../..';
import {
  getTestWallet,
  getTestConnection,
  getAllTestTokens,
  getAllTestPools,
  createTestKeypair,
  waitForConfirmation,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';

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

async function runShapeTest(
  shape: LiquidityShape,
  binRange: [number, number],
  baseAmount: bigint,
  quoteAmount: bigint,
  validate: (bins: any[]) => void
) {
  const poolAddress = new PublicKey(testPool.pair);
  const positionKeypair = createTestKeypair();

  try {
    const createTx = await lbServices.createPosition({
      poolAddress,
      binRange,
      payer: testWallet.keypair.publicKey,
      positionMint: positionKeypair.publicKey,
    });
    await waitForConfirmation(
      await connection.sendTransaction(createTx, [testWallet.keypair, positionKeypair]),
      connection
    );

    const addTx = await lbServices.addLiquidityByShape({
      poolAddress,
      positionMint: positionKeypair.publicKey,
      payer: testWallet.keypair.publicKey,
      baseAmount,
      quoteAmount,
      liquidityShape: shape,
      binRange,
    });
    await waitForConfirmation(
      await connection.sendTransaction(addTx, [testWallet.keypair]),
      connection
    );

    const positionAddr = PublicKey.findProgramAddressSync(
      [Buffer.from('position'), positionKeypair.publicKey.toBuffer()],
      lbServices.lbProgram.programId
    )[0];
    const bins = await lbServices.getPositionBinBalances({
      position: positionAddr,
      poolAddress,
      payer: testWallet.keypair.publicKey,
    });

    validate(bins.filter((b) => b.baseReserve > 0n || b.quoteReserve > 0n));
  } catch (err) {
    if (!isInsufficientFundsError(err)) throw err;
  } finally {
    await cleanupLiquidity(positionKeypair, poolAddress);
  }
}

describe('Liquidity Shape Distribution', () => {
  it('validates Spot distribution', async () => {
    await runShapeTest(LiquidityShape.Spot, [-4, 4], 50_000_000_000n, 50_000_000n, (activeBins) => {
      expect(activeBins.length).toBeGreaterThan(0);
      const negAvg = average(
        activeBins.filter((b) => b.binPosition < 0).map((b) => b.quoteReserve)
      );
      const posAvg = average(activeBins.filter((b) => b.binPosition > 0).map((b) => b.baseReserve));
      if (negAvg !== null) expect(negAvg).toBeGreaterThan(0n);
      if (posAvg !== null) expect(posAvg).toBeGreaterThan(0n);
    });
  });

  it('validates Curve distribution', async () => {
    await runShapeTest(LiquidityShape.Curve, [-6, 6], 75_000_000_000n, 75_000_000n, (bins) => {
      const center = average(
        bins.filter((b) => Math.abs(b.binPosition) <= 1).map((b) => b.baseReserve + b.quoteReserve)
      );
      const edges = average(
        bins.filter((b) => Math.abs(b.binPosition) > 3).map((b) => b.baseReserve + b.quoteReserve)
      );
      if (center !== null && edges !== null) expect(center).toBeGreaterThan(edges);
    });
  });

  it('validates BidAsk distribution', async () => {
    await runShapeTest(LiquidityShape.BidAsk, [-3, 3], 50_000_000_000n, 50_000_000n, (bins) => {
      expect(bins.length).toBeGreaterThan(0);
      const mid = bins.find((b) => b.binPosition === 0);
      if (mid) expect(mid.baseReserve + mid.quoteReserve).toBeGreaterThan(0n);
    });
  });
});

function average(arr: bigint[]): bigint | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0n) / BigInt(arr.length);
}
