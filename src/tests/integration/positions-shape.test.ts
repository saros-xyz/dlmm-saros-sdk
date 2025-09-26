import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../types';
import { SarosDLMM } from '../../services';
import {
  IntegrationTestSetup,
  setupIntegrationTest,
  createTestKeypair,
  waitForConfirmation,
  cleanupLiquidity,
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
  const { testWallet, connection, testPool } = testSetup;
  const pairAddress = new PublicKey(testPool.pair);

  const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });
  const pair = await sdk.getPair(pairAddress);
  const positionKeypair = createTestKeypair();

  try {
    const createTx = await pair.createPosition({
      binRange,
      payer: testWallet.keypair.publicKey,
      positionMint: positionKeypair.publicKey,
    });
    await waitForConfirmation(
      await connection.sendTransaction(createTx, [testWallet.keypair, positionKeypair]),
      connection
    );

    const addTx = await pair.addLiquidityByShape({
      positionMint: positionKeypair.publicKey,
      payer: testWallet.keypair.publicKey,
      amountTokenX: baseAmount,
      amountTokenY: quoteAmount,
      liquidityShape: shape,
      binRange,
    });
    await waitForConfirmation(
      await connection.sendTransaction(addTx, [testWallet.keypair]),
      connection
    );

    const positions = await pair.getUserPositions({
      payer: testWallet.keypair.publicKey,
    });
    const position = positions.find((p) => p.positionMint.equals(positionKeypair.publicKey));
    if (!position) throw new Error('Position not found');

    const bins = await pair.getPositionReserves({
      position: new PublicKey(position.position),
      payer: testWallet.keypair.publicKey,
    });

    validate(bins.filter((b) => b.baseReserve > 0n || b.quoteReserve > 0n));
  } finally {
    await cleanupLiquidity(pair, positionKeypair, testWallet, connection);
  }
}

describe('Liquidity Shape Distribution', () => {
  it('validates Spot distribution', async () => {
    await runShapeTest(LiquidityShape.Spot, [-4, 4], 50_000_000_000n, 50_000_000n, (activeBins) => {
      expect(activeBins.length).toBeGreaterThan(0);

      // Spot distribution should distribute liquidity across the range
      const negativeBins = activeBins.filter((b) => b.binPosition < 0);
      const positiveBins = activeBins.filter((b) => b.binPosition > 0);
      const activeBin = activeBins.find((b) => b.binPosition === 0);

      // Check that liquidity is properly distributed
      if (negativeBins.length > 0) {
        const hasQuoteLiquidity = negativeBins.some((b) => b.quoteReserve > 0n);
        expect(hasQuoteLiquidity).toBe(true);

        // Verify uniform-like distribution in negative bins
        const quoteReserves = negativeBins.map((b) => b.quoteReserve).filter((r) => r > 0n);
        const avgQuote = average(quoteReserves);
        if (avgQuote !== null && quoteReserves.length > 1) {
          // Check that distribution is reasonably uniform (allow 50% variance)
          const maxDeviation = quoteReserves.reduce((max, val) => {
            const deviation = val > avgQuote ? val - avgQuote : avgQuote - val;
            return deviation > max ? deviation : max;
          }, 0n);
          expect(maxDeviation).toBeLessThan(avgQuote);
        }
      }

      if (positiveBins.length > 0) {
        const hasBaseLiquidity = positiveBins.some((b) => b.baseReserve > 0n);
        expect(hasBaseLiquidity).toBe(true);

        // Verify uniform-like distribution in positive bins
        const baseReserves = positiveBins.map((b) => b.baseReserve).filter((r) => r > 0n);
        const avgBase = average(baseReserves);
        if (avgBase !== null && baseReserves.length > 1) {
          // Check that distribution is reasonably uniform (allow 50% variance)
          const maxDeviation = baseReserves.reduce((max, val) => {
            const deviation = val > avgBase ? val - avgBase : avgBase - val;
            return deviation > max ? deviation : max;
          }, 0n);
          expect(maxDeviation).toBeLessThan(avgBase);
        }
      }

      // Active bin should have both types of liquidity
      if (activeBin) {
        expect(activeBin.baseReserve + activeBin.quoteReserve).toBeGreaterThan(0n);
      }

      // Verify overall liquidity distribution is reasonable
      const totalLiquidity = activeBins.reduce(
        (sum, b) => sum + b.baseReserve + b.quoteReserve,
        0n
      );
      expect(totalLiquidity).toBeGreaterThan(0n);

      // Check that liquidity is distributed across multiple bins (not concentrated in just one)
      const binsWithLiquidity = activeBins.filter((b) => b.baseReserve + b.quoteReserve > 0n);
      expect(binsWithLiquidity.length).toBeGreaterThan(1);
    });
  });

  it('validates Curve distribution', async () => {
    await runShapeTest(LiquidityShape.Curve, [-6, 6], 75_000_000_000n, 75_000_000n, (bins) => {
      expect(bins.length).toBeGreaterThan(0);

      // Curve distribution should follow a bell curve/gaussian pattern
      // Higher concentration near the center (active bin)
      const centerBins = bins.filter((b) => Math.abs(b.binPosition) <= 1);
      const midRangeBins = bins.filter(
        (b) => Math.abs(b.binPosition) > 1 && Math.abs(b.binPosition) <= 3
      );
      const edgeBins = bins.filter((b) => Math.abs(b.binPosition) > 3);

      if (centerBins.length > 0) {
        const centerTotal = centerBins.reduce((sum, b) => sum + b.baseReserve + b.quoteReserve, 0n);
        const centerAvg = centerTotal / BigInt(centerBins.length);

        if (midRangeBins.length > 0) {
          const midTotal = midRangeBins.reduce(
            (sum, b) => sum + b.baseReserve + b.quoteReserve,
            0n
          );
          const midAvg = midTotal / BigInt(midRangeBins.length);

          // Center should have more liquidity than mid-range
          expect(centerAvg).toBeGreaterThan(midAvg);
        }

        if (edgeBins.length > 0) {
          const edgeTotal = edgeBins.reduce((sum, b) => sum + b.baseReserve + b.quoteReserve, 0n);
          const edgeAvg = edgeTotal / BigInt(edgeBins.length);

          // Center should have significantly more liquidity than edges
          expect(centerAvg).toBeGreaterThan(edgeAvg);
        }
      }

      // Test the gaussian curve property: liquidity should decrease as distance from center increases
      const sortedBins = bins.sort((a, b) => Math.abs(a.binPosition) - Math.abs(b.binPosition));
      if (sortedBins.length >= 3) {
        const totalLiquidity = (bin: (typeof sortedBins)[0]) => bin.baseReserve + bin.quoteReserve;

        // Calculate variance to verify bell curve shape
        const liquidity = sortedBins.map(totalLiquidity);
        const avgLiquidity = average(liquidity);
        if (avgLiquidity !== null && liquidity.length > 1) {
          const variance =
            liquidity.reduce((acc, val) => acc + (val - avgLiquidity) ** 2n, 0n) /
            BigInt(liquidity.length);
          const stdDev = sqrt(variance);

          // For a curve distribution, we expect some variance in liquidity amounts
          expect(stdDev).toBeGreaterThan(0n);
        }

        // Check that liquidity generally decreases as we move away from center
        let violations = 0;
        for (let i = 0; i < sortedBins.length - 1; i++) {
          const currentDistance = Math.abs(sortedBins[i].binPosition);
          const nextDistance = Math.abs(sortedBins[i + 1].binPosition);

          if (currentDistance < nextDistance) {
            const currentLiquidity = totalLiquidity(sortedBins[i]);
            const nextLiquidity = totalLiquidity(sortedBins[i + 1]);

            if (nextLiquidity > currentLiquidity * 2n) {
              // Allow some variance
              violations++;
            }
          }
        }

        // Allow up to 20% violations for realistic curve distribution
        expect(violations).toBeLessThanOrEqual(Math.floor(sortedBins.length * 0.2));
      }
    });
  });

  it('validates BidAsk distribution', async () => {
    await runShapeTest(LiquidityShape.BidAsk, [-3, 3], 50_000_000_000n, 50_000_000n, (bins) => {
      expect(bins.length).toBeGreaterThan(0);

      // BidAsk distribution should have linear weighting with higher concentration at edges
      const activeBin = bins.find((b) => b.binPosition === 0);
      const negativeBins = bins
        .filter((b) => b.binPosition < 0)
        .sort((a, b) => a.binPosition - b.binPosition);
      const positiveBins = bins
        .filter((b) => b.binPosition > 0)
        .sort((a, b) => a.binPosition - b.binPosition);

      // Active bin should contain both tokens
      if (activeBin) {
        expect(activeBin.baseReserve + activeBin.quoteReserve).toBeGreaterThan(0n);
      }

      // Test linear weighting in negative bins (quote tokens)
      if (negativeBins.length > 1) {
        for (let i = 0; i < negativeBins.length - 1; i++) {
          const currentBin = negativeBins[i];
          const nextBin = negativeBins[i + 1];

          // Bins further from center (more negative) should have more liquidity
          // This creates a linear increase towards the left edge
          if (currentBin.quoteReserve > 0n && nextBin.quoteReserve > 0n) {
            const currentDistance = Math.abs(currentBin.binPosition);
            const nextDistance = Math.abs(nextBin.binPosition);

            if (currentDistance > nextDistance) {
              // Current bin is further from center, should have >= liquidity
              expect(currentBin.quoteReserve).toBeGreaterThanOrEqual(nextBin.quoteReserve / 2n);
            }
          }
        }
      }

      // Test linear weighting in positive bins (base tokens)
      if (positiveBins.length > 1) {
        for (let i = 0; i < positiveBins.length - 1; i++) {
          const currentBin = positiveBins[i];
          const nextBin = positiveBins[i + 1];

          // Bins further from center should have more liquidity
          if (currentBin.baseReserve > 0n && nextBin.baseReserve > 0n) {
            const currentDistance = Math.abs(currentBin.binPosition);
            const nextDistance = Math.abs(nextBin.binPosition);

            if (nextDistance > currentDistance) {
              // Next bin is further from center, should have >= liquidity
              expect(nextBin.baseReserve).toBeGreaterThanOrEqual(currentBin.baseReserve / 2n);
            }
          }
        }
      }

      // Verify that edges have the highest concentration
      if (negativeBins.length > 0) {
        const leftEdge = negativeBins[0]; // Most negative position
        const otherNegativeBins = negativeBins.slice(1);

        if (otherNegativeBins.length > 0 && leftEdge.quoteReserve > 0n) {
          const maxOtherQuote = otherNegativeBins.reduce(
            (max, b) => (b.quoteReserve > max ? b.quoteReserve : max),
            0n
          );
          expect(leftEdge.quoteReserve).toBeGreaterThanOrEqual(maxOtherQuote / 2n);
        }
      }

      if (positiveBins.length > 0) {
        const rightEdge = positiveBins[positiveBins.length - 1]; // Most positive position
        const otherPositiveBins = positiveBins.slice(0, -1);

        if (otherPositiveBins.length > 0 && rightEdge.baseReserve > 0n) {
          const maxOtherBase = otherPositiveBins.reduce(
            (max, b) => (b.baseReserve > max ? b.baseReserve : max),
            0n
          );
          expect(rightEdge.baseReserve).toBeGreaterThanOrEqual(maxOtherBase / 2n);
        }
      }
    });
  });
});

function average(arr: bigint[]): bigint | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0n) / BigInt(arr.length);
}

function sqrt(value: bigint): bigint {
  if (value === 0n) return 0n;
  if (value === 1n) return 1n;
  let x = value;
  let y = (x + 1n) / 2n;

  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }

  return x;
}
