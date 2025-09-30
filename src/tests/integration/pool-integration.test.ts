import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../services';
import {
  waitForConfirmation,
  saveTestPool,
  getTestToken,
  findTestPool,
  NATIVE_SOL,
  getTestWallet,
  getTestConnection,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';
import { MODE } from '../../constants';

let testWallet: any;
let connection: any;
let sdk: SarosDLMM;

async function createOrVerifyPool(
  params: {
    tokenX: { mintAddress: PublicKey; decimals: number };
    tokenY: { mintAddress: PublicKey; decimals: number };
    binStep: number;
    ratePrice: number;
    payer: any;
  },
  poolName: string
) {
  console.log(`Ensuring ${poolName} pool exists...`);

  const result = await sdk.createPair(params);

  try {
    const sig = await connection.sendTransaction(result.transaction, [testWallet.keypair]);
    await waitForConfirmation(sig, connection);
    console.log(`Pool created: ${result.pair}`);
  } catch (err: any) {
    if (!String(err).includes('already in use')) throw err;
    console.log(`Pool already exists: ${result.pair}`);
  }

  // ✅ fetch via instance
  const pair = await sdk.getPair(result.pair);
  const metadata = pair.getPairMetadata();
  expect(metadata.tokenX.mintAddress.toString()).toBe(params.tokenX.mintAddress.toString());
  expect(metadata.tokenY.mintAddress.toString()).toBe(params.tokenY.mintAddress.toString());

  saveTestPool({
    pair: result.pair.toString(),
    tokenX: params.tokenX.mintAddress.toString(),
    tokenY: params.tokenY.mintAddress.toString(),
    binStep: params.binStep,
    ratePrice: params.ratePrice,
    activeBin: result.activeBin,
    binArrayLower: result.binArrayLower.toString(),
    binArrayUpper: result.binArrayUpper.toString(),
    signature: result.transaction.signatures?.[0].signature?.toString() ?? '',
  });

  return { ...result, metadata };
}

beforeAll(async () => {
  await ensureTestEnvironment();
  testWallet = getTestWallet();
  connection = getTestConnection();
  // ✅ instantiate SDK once
  sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });
});

describe('Pool Creation Integration', () => {
  it('rejects invalid parameters', async () => {
    const saros = getTestToken('SAROSDEV');
    await expect(
      sdk.createPair({
        tokenX: saros,
        tokenY: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
        binStep: 25,
        ratePrice: 0,
        payer: testWallet.keypair.publicKey,
      })
    ).rejects.toThrow();
  });

  it('creates and verifies SAROSDEV/wSOL pool', async () => {
    const saros = getTestToken('SAROSDEV');
    const existing = findTestPool('SAROSDEV', 'wSOL', 25);
    if (existing) {
      console.log(`Using existing pool: ${existing.pair}`);
      return;
    }
    const result = await createOrVerifyPool(
      {
        tokenX: saros,
        tokenY: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
        binStep: 25,
        ratePrice: 0.00001,
        payer: testWallet.keypair.publicKey,
      },
      'SAROSDEV/wSOL'
    );
    expect(result.activeBin).toBeGreaterThan(0);
  });

  it('creates and verifies TESTWBTC/wSOL pool', async () => {
    const wbtc = getTestToken('TESTWBTC');
    const existing = findTestPool('TESTWBTC', 'wSOL', 20);
    if (existing) {
      console.log(`Using existing pool: ${existing.pair}`);
      return;
    }
    const result = await createOrVerifyPool(
      {
        tokenX: wbtc,
        tokenY: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
        binStep: 20,
        ratePrice: 2000,
        payer: testWallet.keypair.publicKey,
      },
      'TESTWBTC/wSOL'
    );
    expect(result.activeBin).toBeGreaterThan(0);
  });
});
