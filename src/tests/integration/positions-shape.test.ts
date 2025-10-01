import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BIN_ARRAY_SIZE, LiquidityShape, MODE } from '../../constants';
import { SarosDLMM } from '../../services';
import { waitForConfirmation, cleanupLiquidity } from '../setup/test-util';
import { SarosDLMMPair } from '../../services/pair';

async function runShapeTest(
  shape: LiquidityShape,
  binRange: [number, number],
  baseAmount: bigint,
  quoteAmount: bigint,
  validate: (bins: any[], pair: SarosDLMMPair) => Promise<void> | void
) {
  const { wallet, pool, connection } = global.testEnv;
  const pairAddress = new PublicKey(pool.pair);

  const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });
  const pair = await sdk.getPair(pairAddress);
  const positionKeypair = new Keypair();

  try {
    const createTx = await pair.createPosition({
      binRange,
      payer: wallet.keypair.publicKey,
      positionMint: positionKeypair.publicKey,
    });
    await waitForConfirmation(
      await connection.sendTransaction(createTx, [wallet.keypair, positionKeypair]),
      connection
    );

    const addTx = await pair.addLiquidityByShape({
      positionMint: positionKeypair.publicKey,
      payer: wallet.keypair.publicKey,
      amountTokenX: baseAmount,
      amountTokenY: quoteAmount,
      liquidityShape: shape,
      binRange,
    });
    await waitForConfirmation(await connection.sendTransaction(addTx, [wallet.keypair]), connection);

    const positions = await pair.getUserPositions({
      payer: wallet.keypair.publicKey,
    });
    const position = positions.find((p) => p.positionMint.equals(positionKeypair.publicKey));
    if (!position) throw new Error('Position not found');

    const bins = await pair.getPositionReserves(new PublicKey(position.position));

    await validate(
      bins.filter((b) => b.baseReserve > 0n || b.quoteReserve > 0n),
      pair
    );
  } finally {
    await cleanupLiquidity(pair, positionKeypair, wallet, connection);
  }
}

describe('Liquidity Shape Distribution', () => {
  it('validates Spot distribution and bin arrays', async () => {
    await runShapeTest(
      LiquidityShape.Spot,
      [-4, 4],
      200_000_000_000n,
      200_000_000n,
      async (positionBins, pair) => {
        expect(positionBins.length).toBeGreaterThan(3);

        // Bin array-level verification
        const activeId = pair.getPairAccount().activeId;
        const activeArrayIndex = Math.floor(activeId / BIN_ARRAY_SIZE);
        const binArray = await pair.getBinArrayReserves(activeArrayIndex);

        expect(binArray.bins.length).toBeGreaterThan(0);

        const activeBin = binArray.bins.find((b: any) => b.id === activeId);
        expect(activeBin).toBeDefined();

        // Check liquidity exists around active bin
        const neighbors = binArray.bins.filter((b: any) => Math.abs(b.id - activeId) <= 2);
        expect(neighbors.some((b: any) => b.reserveX > 0n || b.reserveY > 0n)).toBe(true);

        // Uniform-ish check
        const nonzero = neighbors.filter((b: any) => b.reserveX > 0n || b.reserveY > 0n);
        const avg = average(nonzero.map((b: any) => b.reserveX + b.reserveY));
        nonzero.forEach((b: any) => {
          expect(b.reserveX + b.reserveY).toBeGreaterThan(avg / 3n);
        });
      }
    );
  });

  it('validates Curve distribution', async () => {
    await runShapeTest(
      LiquidityShape.Curve,
      [-6, 6],
      75_000_000_000n,
      75_000_000n,
      (bins) => {
        expect(bins.length).toBeGreaterThan(0);

        const center = bins.filter((b) => Math.abs(b.binPosition) <= 1);
        const mid = bins.filter((b) => Math.abs(b.binPosition) <= 3 && Math.abs(b.binPosition) > 1);
        const edges = bins.filter((b) => Math.abs(b.binPosition) > 3);

        if (center.length && mid.length) {
          expect(avgLiquidity(center)).toBeGreaterThan(avgLiquidity(mid));
        }
        if (center.length && edges.length) {
          expect(avgLiquidity(center)).toBeGreaterThan(avgLiquidity(edges));
        }

        // sanity: liquidity decreases outward
        const sorted = [...bins].sort((a, b) => Math.abs(a.binPosition) - Math.abs(b.binPosition));
        let violations = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          const curr = sorted[i].baseReserve + sorted[i].quoteReserve;
          const next = sorted[i + 1].baseReserve + sorted[i + 1].quoteReserve;
          if (next > curr * 2n) violations++;
        }
        expect(violations).toBeLessThanOrEqual(Math.floor(sorted.length * 0.2));
      }
    );
  });

  it('validates BidAsk distribution', async () => {
    await runShapeTest(
      LiquidityShape.BidAsk,
      [-3, 3],
      50_000_000_000n,
      50_000_000n,
      (bins) => {
        expect(bins.length).toBeGreaterThan(0);

        const negative = bins.filter((b) => b.binPosition < 0);
        const positive = bins.filter((b) => b.binPosition > 0);

        // Negative side should favor quote reserves
        if (negative.length) {
          const farLeft = negative.reduce((a, b) =>
            Math.abs(b.binPosition) > Math.abs(a.binPosition) ? b : a
          );
          expect(farLeft.quoteReserve).toBeGreaterThan(0n);
        }

        // Positive side should favor base reserves
        if (positive.length) {
          const farRight = positive.reduce((a, b) =>
            Math.abs(b.binPosition) > Math.abs(a.binPosition) ? b : a
          );
          expect(farRight.baseReserve).toBeGreaterThan(0n);
        }
      }
    );
  });
});

// helpers
function average(arr: bigint[]): bigint {
  if (!arr.length) return 0n;
  return arr.reduce((a, b) => a + b, 0n) / BigInt(arr.length);
}
function avgLiquidity(bins: any[]): bigint {
  if (!bins.length) return 0n;
  return bins.reduce((s, b) => s + b.baseReserve + b.quoteReserve, 0n) / BigInt(bins.length);
}
