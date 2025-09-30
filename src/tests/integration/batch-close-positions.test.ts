import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { IntegrationTestSetup, setupIntegrationTest, cleanupLiquidity } from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';
// Batch cleanup for reclaim stray positions on devnet after running tests
// must uncomment line in @vitest.config.ts and then run 'pnpm test:cleanup' 

let testSetup: IntegrationTestSetup;
const RATE_LIMIT_DELAY = 150;
const BATCH_SIZE = 10;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAllUserPositions(pairAddress: PublicKey, userPublicKey: PublicKey) {
  const { lbServices } = testSetup;

  const pairInstance = await lbServices.getPair(pairAddress);
  const userPositions = await pairInstance.getUserPositions({
    payer: userPublicKey,
  });

  return {
    pairInstance,
    positions: userPositions.map((position) => ({
      positionMint: position.positionMint,
    })),
  };
}

async function batchRemoveLiquidity(
  pairInstance: any,
  positions: Array<{ positionMint: PublicKey }>
) {
  const { testWallet, connection } = testSetup;
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < positions.length; i += BATCH_SIZE) {
    const batch = positions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(positions.length / BATCH_SIZE);

    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} positions...`);

    for (const { positionMint } of batch) {
      try {
        await cleanupLiquidity(
          pairInstance,
          { publicKey: positionMint } as any,
          testWallet,
          connection
        );

        results.successful++;
        await sleep(RATE_LIMIT_DELAY);
      } catch (error) {
        results.failed++;
        const errorMsg = `Position ${positionMint.toString()}: ${error}`;
        results.errors.push(errorMsg);
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    console.log(`✅ ${results.successful} successful | ❌ ${results.failed} failed`);

    if (i + BATCH_SIZE < positions.length) {
      await sleep(RATE_LIMIT_DELAY * 2);
    }
  }

  return results;
}

beforeAll(async () => {
  await ensureTestEnvironment();
  testSetup = setupIntegrationTest();
});

describe('Batch Position Closing', () => {
  it('closes all user positions in the test pool to reclaim devnet SOL', async () => {
    const { testWallet, testPool } = testSetup;
    const pairAddress = new PublicKey(testPool.pair);

    console.log(`\n🔍 Scanning pool ${testPool.pair.slice(0, 8)}...`);
    const { pairInstance, positions } = await getAllUserPositions(
      pairAddress,
      testWallet.keypair.publicKey
    );

    if (positions.length === 0) {
      console.log('✨ No positions found - nothing to clean up');
      expect(positions.length).toBe(0);
      return;
    }

    console.log(`📋 Found ${positions.length} position(s) to remove`);
    const results = await batchRemoveLiquidity(pairInstance, positions);

    console.log(`\n📊 Final Results: ${results.successful} successful, ${results.failed} failed`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    expect(results.successful + results.failed).toBe(positions.length);

    console.log('✨ Cleanup complete\n');
  }, 300000); // 5 min timeout
});
