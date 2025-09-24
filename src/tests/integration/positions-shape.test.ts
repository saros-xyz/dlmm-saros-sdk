import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { LiquidityShape } from '../../types';
import {
  IntegrationTestSetup,
  setupIntegrationTest,
  createTestKeypair,
  waitForConfirmation,
  cleanupLiquidity,
  isInsufficientFundsError,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';

let testSetup: IntegrationTestSetup;

beforeAll(async () => {
  await ensureTestEnvironment();
  testSetup = setupIntegrationTest();
});

async function runShapeTest(
  shape: LiquidityShape,
  binRange: [number, number],
  baseAmount: bigint,
  quoteAmount: bigint,
  validate: (bins: any[]) => void
) {
  const { lbServices, testWallet, connection, testPool } = testSetup;
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
    await cleanupLiquidity(lbServices, positionKeypair, poolAddress, testWallet, connection);
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
