import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import { LiquidityShape, MODE } from '../../constants';
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
  const { wallet, pool, connection, } = global.testEnv;
    const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });

  const pairAddress = new PublicKey(pool.pair);

  const pair = await sdk.getPair(pairAddress);
  const positionKeypair = Keypair.generate();

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

    await pair.refetchState();

    const addTx = await pair.addLiquidityByShape({
      positionMint: positionKeypair.publicKey,
      payer: wallet.keypair.publicKey,
      amountTokenX: baseAmount,
      amountTokenY: quoteAmount,
      liquidityShape: shape,
      binRange,
    });
    await waitForConfirmation(await connection.sendTransaction(addTx, [wallet.keypair]), connection);

    await pair.refetchState();
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
      100_000_000_000_000n, // 100,000 SAROSDEV
      200_000_000n,         // 0.2 SOL (balanced with ratePrice 0.000002)
      async (positionBins, pair) => {
        expect(positionBins.length).toBeGreaterThan(3);

        // Bin array-level verification
        const activeId = pair.getPairAccount().activeId;
        const activeBins = await pair.getActiveReserves(4); // Get 4 bins on each side

        expect(activeBins.length).toBeGreaterThan(0);

        const activeBin = activeBins.find((b: any) => b.binId === activeId);
        expect(activeBin).toBeDefined();

        // Check liquidity exists around active bin
        const neighbors = activeBins.filter((b: any) => Math.abs(b.binId - activeId) <= 2);
        expect(neighbors.some((b: any) => b.reserveX > 0n || b.reserveY > 0n)).toBe(true);

        // Uniform-ish check - test X and Y reserves separately since Spot distribution
        // puts only X in bins > 0 and only Y in bins < 0
        const binsWithX = neighbors.filter((b: any) => b.reserveX > 0n);
        const binsWithY = neighbors.filter((b: any) => b.reserveY > 0n);

        // If there are X reserves, they should be relatively uniform
        if (binsWithX.length > 1) {
          const avgX = average(binsWithX.map((b: any) => b.reserveX));
          binsWithX.forEach((b: any) => {
            expect(b.reserveX).toBeGreaterThan(avgX / 3n);
          });
        }

        // If there are Y reserves, they should be relatively uniform
        if (binsWithY.length > 1) {
          const avgY = average(binsWithY.map((b: any) => b.reserveY));
          binsWithY.forEach((b: any) => {
            expect(b.reserveY).toBeGreaterThan(avgY / 3n);
          });
        }
      }
    );
  });

  it('validates Curve distribution', async () => {
    await runShapeTest(
      LiquidityShape.Curve,
      [-6, 6],
      75_000_000_000_000n, // 75,000 SAROSDEV
      150_000_000n,        // 0.15 SOL (balanced with ratePrice 0.000002)
      (bins, pair) => {
        expect(bins.length).toBeGreaterThan(0);

        // Get active bin ID to calculate relative positions
        const activeId = pair.getPairAccount().activeId;

        // Calculate relative positions for each bin
        const binsWithRelPos = bins.map((b) => ({
          ...b,
          relativePosition: b.binId - activeId,
        }));

        // Curve should concentrate liquidity near center (bin 0)
        const negativeBins = binsWithRelPos.filter((b) => b.relativePosition < 0);
        const centerBins = binsWithRelPos.filter((b) => Math.abs(b.relativePosition) <= 1);
        const positiveBins = binsWithRelPos.filter((b) => b.relativePosition > 0);

        // Test Y reserves (negative side) - should be higher near center
        if (negativeBins.length > 1) {
          const sortedY = [...negativeBins].sort((a, b) => Math.abs(a.relativePosition) - Math.abs(b.relativePosition));
          const nearCenterY = sortedY.slice(0, Math.ceil(sortedY.length / 2));
          const farEdgeY = sortedY.slice(Math.ceil(sortedY.length / 2));
          if (nearCenterY.length && farEdgeY.length) {
            const avgNearY = average(nearCenterY.map((b) => b.quoteReserve));
            const avgFarY = average(farEdgeY.map((b) => b.quoteReserve));
            expect(avgNearY).toBeGreaterThan(avgFarY);
          }
        }

        // Test X reserves (positive side) - should be higher near center
        if (positiveBins.length > 1) {
          const sortedX = [...positiveBins].sort((a, b) => Math.abs(a.relativePosition) - Math.abs(b.relativePosition));
          const nearCenterX = sortedX.slice(0, Math.ceil(sortedX.length / 2));
          const farEdgeX = sortedX.slice(Math.ceil(sortedX.length / 2));
          if (nearCenterX.length && farEdgeX.length) {
            const avgNearX = average(nearCenterX.map((b) => b.baseReserve));
            const avgFarX = average(farEdgeX.map((b) => b.baseReserve));
            expect(avgNearX).toBeGreaterThan(avgFarX);
          }
        }

        // Center bins should have liquidity
        expect(centerBins.length).toBeGreaterThan(0);
        expect(centerBins.some((b) => b.baseReserve > 0n || b.quoteReserve > 0n)).toBe(true);
      }
    );
  });

  it('validates BidAsk distribution', async () => {
    await runShapeTest(
      LiquidityShape.BidAsk,
      [-3, 3],
      50_000_000_000_000n, // 50,000 SAROSDEV
      100_000_000n,        // 0.1 SOL (balanced with ratePrice 0.000002)
      (bins) => {
        expect(bins.length).toBeGreaterThan(0);

        // BidAsk concentrates liquidity at the edges
        const negativeBins = bins.filter((b) => b.binPosition < 0);
        const positiveBins = bins.filter((b) => b.binPosition > 0);

        // Negative side (left) should have Y reserves (quote/SOL)
        // Bins further from center should have MORE liquidity (inverse of Curve)
        if (negativeBins.length > 1) {
          const sortedY = [...negativeBins].sort((a, b) => Math.abs(b.binPosition) - Math.abs(a.binPosition));
          const farthestY = sortedY[0]; // Most negative bin
          expect(farthestY.quoteReserve).toBeGreaterThan(0n);

          // Verify liquidity increases toward edges (inverse of Curve)
          const edgeY = sortedY.slice(0, Math.ceil(sortedY.length / 2));
          const innerY = sortedY.slice(Math.ceil(sortedY.length / 2));
          if (edgeY.length && innerY.length) {
            const avgEdgeY = average(edgeY.map((b) => b.quoteReserve));
            const avgInnerY = average(innerY.map((b) => b.quoteReserve));
            expect(avgEdgeY).toBeGreaterThanOrEqual(avgInnerY);
          }
        }

        // Positive side (right) should have X reserves (base/SAROSDEV)
        // Bins further from center should have MORE liquidity
        if (positiveBins.length > 1) {
          const sortedX = [...positiveBins].sort((a, b) => Math.abs(b.binPosition) - Math.abs(a.binPosition));
          const farthestX = sortedX[0]; // Most positive bin
          expect(farthestX.baseReserve).toBeGreaterThan(0n);

          // Verify liquidity increases toward edges
          const edgeX = sortedX.slice(0, Math.ceil(sortedX.length / 2));
          const innerX = sortedX.slice(Math.ceil(sortedX.length / 2));
          if (edgeX.length && innerX.length) {
            const avgEdgeX = average(edgeX.map((b) => b.baseReserve));
            const avgInnerX = average(innerX.map((b) => b.baseReserve));
            expect(avgEdgeX).toBeGreaterThanOrEqual(avgInnerX);
          }
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
