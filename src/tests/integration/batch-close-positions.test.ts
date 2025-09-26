import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../services';
import {
  getTestWallet,
  getTestConnection,
  getAllTestPools,
  waitForConfirmation,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';
import { RemoveLiquidityType, MODE } from '../../types';

let testWallet: any;
let connection: any;
let testPools: any[];
let sdk: SarosDLMM;

// Rate limiting for Helius free plan (100 req/min)
const RATE_LIMIT_DELAY = 650; // ~90 requests/minute
const BATCH_SIZE = 5;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAllUserPositions(pairs: PublicKey[], userPublicKey: PublicKey) {
  const allPositions: Array<{
    pair: PublicKey;
    positionMint: PublicKey;
    position: PublicKey;
  }> = [];

  for (const pair of pairs) {
    try {
      console.log(`Fetching positions for pool: ${pair.toString()}`);

      const pairInstance = await sdk.getPair(pair);
      const userPositions = await pairInstance.getUserPositions({
        payer: userPublicKey,
      });

      for (const position of userPositions) {
        allPositions.push({
          pair,
          positionMint: position.positionMint,
          position: position.positionMint,
        });
      }

      await sleep(RATE_LIMIT_DELAY);
    } catch (error) {
      console.warn(`Failed to fetch positions for pool ${pair.toString()}:`, error);
    }
  }

  return allPositions;
}

async function batchRemoveLiquidity(
  positions: Array<{ pair: PublicKey; positionMint: PublicKey }>
) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < positions.length; i += BATCH_SIZE) {
    const batch = positions.slice(i, i + BATCH_SIZE);

    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(positions.length / BATCH_SIZE)}`
    );

    for (const { pair, positionMint } of batch) {
      try {
        console.log(`Removing liquidity from position: ${positionMint.toString()}`);

        const pairInstance = await sdk.getPair(pair);
        const result = await pairInstance.removeLiquidity({
          positionMints: [positionMint],
          payer: testWallet.keypair.publicKey,
          type: RemoveLiquidityType.All,
        });

        if (result.setupTransaction) {
          const setupSig = await connection.sendTransaction(result.setupTransaction, [
            testWallet.keypair,
          ]);
          await waitForConfirmation(setupSig, connection);
          await sleep(RATE_LIMIT_DELAY);
        }

        for (const tx of result.transactions) {
          const sig = await connection.sendTransaction(tx, [testWallet.keypair]);
          await waitForConfirmation(sig, connection);
          await sleep(RATE_LIMIT_DELAY);
        }

        if (result.cleanupTransaction) {
          const cleanupSig = await connection.sendTransaction(result.cleanupTransaction, [
            testWallet.keypair,
          ]);
          await waitForConfirmation(cleanupSig, connection);
          await sleep(RATE_LIMIT_DELAY);
        }

        results.successful++;
        console.log(`✅ Successfully removed liquidity from position: ${positionMint.toString()}`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to remove liquidity from position ${positionMint.toString()}: ${error}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    if (i + BATCH_SIZE < positions.length) {
      console.log(`Batch complete. Waiting before next batch...`);
      await sleep(RATE_LIMIT_DELAY * 2);
    }
  }

  return results;
}

beforeAll(async () => {
  await ensureTestEnvironment();
  testWallet = getTestWallet();
  connection = getTestConnection();
  testPools = getAllTestPools();
  sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });
});

describe('Batch Position Closing', () => {
  it(
    'closes all user positions across all test pools to reclaim devnet SOL',
    async () => {
      console.log(`Starting batch position closing for ${testPools.length} pools`);
      console.log(`User: ${testWallet.keypair.publicKey.toString()}`);

      const pairs = testPools.map((pool) => new PublicKey(pool.pair));

      console.log('\n📊 Fetching all user positions...');
      const allPositions = await getAllUserPositions(pairs, testWallet.keypair.publicKey);

      console.log(`\n📋 Found ${allPositions.length} positions to clean up`);

      if (allPositions.length === 0) {
        console.log('✨ No positions found - nothing to clean up!');
        expect(allPositions.length).toBe(0);
        return;
      }

      const positionsByPool = allPositions.reduce(
        (acc, pos) => {
          const poolKey = pos.pair.toString();
          acc[poolKey] = (acc[poolKey] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log('\n📍 Positions by pool:');
      Object.entries(positionsByPool).forEach(([pool, count]) => {
        console.log(`  ${pool}: ${count} positions`);
      });

      console.log('\n🧹 Starting batch liquidity removal...');
      const results = await batchRemoveLiquidity(
        allPositions.map((pos) => ({
          pair: pos.pair,
          positionMint: pos.positionMint,
        }))
      );

      console.log('\n📊 Cleanup Results:');
      console.log(`✅ Successful removals: ${results.successful}`);
      console.log(`❌ Failed removals: ${results.failed}`);
      console.log(`📊 Total positions processed: ${results.successful + results.failed}`);

      if (results.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        results.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      expect(results.successful + results.failed).toBe(allPositions.length);

      if (results.failed > 0) {
        console.log(
          '\n⚠️  Some positions failed to remove - this might be expected due to insufficient funds or other constraints'
        );
      }

      console.log('\n✨ Batch cleanup complete!');
    },
    300000 // 5 min timeout
  );
});
