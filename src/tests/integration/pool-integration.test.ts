import { describe, expect, it, beforeAll } from 'vitest';
import { MODE, SarosDLMM } from '../../../dist';
import {
  waitForConfirmation,
  saveTestPool,
  getTestWallet,
  getTestConnection,
  getTestToken,
  findTestPool,
  NATIVE_SOL,
} from '../setup/test-helpers';
import { ensureTestEnvironment } from '../setup/test-setup';

let lbServices: SarosDLMM;
let testWallet: any;
let connection: any;

async function createOrVerifyPool(
  params: {
    baseToken: { mintAddress: string; decimals: number };
    quoteToken: { mintAddress: string; decimals: number };
    binStep: number;
    ratePrice: number;
    payer: any;
  },
  poolName: string
) {
  console.log(`Ensuring ${poolName} pool exists...`);

  const result = await lbServices.createPool(params);
  try {
    const sig = await connection.sendTransaction(result.transaction, [testWallet.keypair]);
    await waitForConfirmation(sig, connection);
    console.log(`Pool created: ${result.pair}`);
  } catch (err: any) {
    if (!String(err).includes('already in use')) throw err;
    console.log(`Pool already exists: ${result.pair}`);
  }

  const metadata = await lbServices.getPoolMetadata(result.pair);
  expect(metadata.baseToken.mintAddress).toBe(params.baseToken.mintAddress);
  expect(metadata.quoteToken.mintAddress).toBe(params.quoteToken.mintAddress);

  saveTestPool({
    pair: result.pair,
    baseToken: params.baseToken.mintAddress,
    quoteToken: params.quoteToken.mintAddress,
    binStep: params.binStep,
    ratePrice: params.ratePrice,
    activeBin: result.activeBin,
    binArrayLower: result.binArrayLower,
    binArrayUpper: result.binArrayUpper,
    signature: result.transaction.signatures?.[0].signature?.toString() ?? '',
  });

  return { ...result, metadata };
}

beforeAll(async () => {
  await ensureTestEnvironment();
  testWallet = getTestWallet();
  connection = getTestConnection();

  lbServices = new SarosDLMM({
    mode: MODE.DEVNET,
    options: { rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com' },
  });
});

describe('Pool Creation Integration', () => {
  it('rejects invalid parameters', async () => {
    const saros = getTestToken('SAROSDEV');
    await expect(
      lbServices.createPool({
        baseToken: saros,
        quoteToken: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
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
        baseToken: saros,
        quoteToken: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
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
        baseToken: wbtc,
        quoteToken: { mintAddress: NATIVE_SOL.mintAddress, decimals: NATIVE_SOL.decimals },
        binStep: 20,
        ratePrice: 2000,
        payer: testWallet.keypair.publicKey,
      },
      'TESTWBTC/wSOL'
    );
    expect(result.activeBin).toBeGreaterThan(0);
  });
});
