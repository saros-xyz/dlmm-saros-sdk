import { describe, expect, it, beforeAll } from 'vitest';
import { SarosDLMM } from '../../..';
import { MODE } from '../../../types';
import {
  getTestToken,
  findTestPool,
  saveTestPool,
  waitForConfirmation,
} from '../../../test/setup/test-helpers';
import { ensureTestEnvironment } from '../../../test/setup/test-setup';

// Wrapped SOL mint address (same on all networks)
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const WSOL_DECIMALS = 9;

// Helper to check if error indicates pool already exists
function isPoolExistsError(error: unknown): boolean {
  const errorMessage =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);
  return errorMessage.includes('already in use');
}

// Helper function for robust pool creation/verification
async function createOrVerifyPool(
  lbServices: SarosDLMM,
  connection: any,
  testWallet: any,
  poolParams: {
    baseToken: { mintAddress: string; decimals: number };
    quoteToken: { mintAddress: string; decimals: number };
    binStep: number;
    ratePrice: number;
    payer: any;
  },
  poolName: string
) {
  console.log(`Creating/verifying ${poolName} pool...`);

  const createPoolResult = await lbServices.createPool(poolParams);
  let signature = 'existing';
  let wasCreated = false;

  try {
    console.log('Submitting transaction...');
    signature = await connection.sendTransaction(createPoolResult.transaction, [testWallet.keypair]);
    await waitForConfirmation(signature, connection);

    console.log(`Pool created: ${createPoolResult.pair}`);
    wasCreated = true;
  } catch (error) {
    if (isPoolExistsError(error)) {
      console.log(`Pool already exists: ${createPoolResult.pair}`);
    } else {
      throw error;
    }
  }

  // Always verify pool metadata
  const poolMetadata = await lbServices.getPoolMetadata(createPoolResult.pair);

  // Validate metadata structure
  expect(poolMetadata.baseToken.mintAddress).toBe(poolParams.baseToken.mintAddress);
  expect(poolMetadata.quoteToken.mintAddress).toBe(poolParams.quoteToken.mintAddress);
  expect(poolMetadata.baseToken.decimals).toBe(poolParams.baseToken.decimals);
  expect(poolMetadata.quoteToken.decimals).toBe(poolParams.quoteToken.decimals);

  // Save to test data
  saveTestPool({
    pair: createPoolResult.pair,
    baseToken: poolParams.baseToken.mintAddress,
    quoteToken: poolParams.quoteToken.mintAddress,
    binStep: poolParams.binStep,
    ratePrice: poolParams.ratePrice,
    activeBin: createPoolResult.activeBin,
    binArrayLower: createPoolResult.binArrayLower,
    binArrayUpper: createPoolResult.binArrayUpper,
    signature,
  });

  console.log(`${poolName} pool verified and saved`);
  return { ...createPoolResult, signature, wasCreated, metadata: poolMetadata };
}

describe('Pool Creation Integration', () => {
  let lbServices: SarosDLMM;
  let testWallet: any;
  let connection: any;

  beforeAll(async () => {
    await ensureTestEnvironment();

    testWallet = (global as any).testWallet;
    connection = (global as any).testConnection;

    if (!testWallet || !connection) {
      throw new Error('Test environment not properly initialized');
    }
  });

  beforeAll(() => {
    lbServices = new SarosDLMM({
      mode: MODE.DEVNET,
      options: {
        rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      },
    });
  });

  describe('input validation', () => {
    it('should reject invalid rate price', async () => {
      const sarosToken = getTestToken('SAROSDEV');

      await expect(
        lbServices.createPool({
          baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
          quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
          binStep: 25,
          ratePrice: 0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid bin step', async () => {
      const sarosToken = getTestToken('SAROSDEV');

      await expect(
        lbServices.createPool({
          baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
          quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
          binStep: 0,
          ratePrice: 1.0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });
  });

  describe('pool creation and metadata', () => {
    it('should create and verify SAROSDEV/wSOL pool', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const binStep = 25;
      const ratePrice = 0.00001;

      // Check test data first
      const existingPool = findTestPool('SAROSDEV', 'wSOL', binStep);
      if (existingPool) {
        console.log(`Pool found in test data: ${existingPool.pair}`);

        // Verify existing pool metadata
        const poolMetadata = await lbServices.getPoolMetadata(existingPool.pair);
        expect(poolMetadata.baseToken.mintAddress).toBe(sarosToken.mintAddress);
        expect(poolMetadata.quoteToken.mintAddress).toBe(WSOL_MINT);
        expect(poolMetadata.baseToken.decimals).toBe(sarosToken.decimals);
        expect(poolMetadata.quoteToken.decimals).toBe(WSOL_DECIMALS);

        return;
      }

      // Create or verify pool
      const result = await createOrVerifyPool(
        lbServices,
        connection,
        testWallet,
        {
          baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
          quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
          binStep,
          ratePrice,
          payer: testWallet.keypair.publicKey,
        },
        'SAROSDEV/wSOL'
      );

      // Verify result structure
      expect(result.pair).toBeDefined();
      expect(result.activeBin).toBeGreaterThan(0);
      expect(result.metadata.tradeFee).toBeGreaterThan(0);
    });

    it('should create and verify TESTWBTC/wSOL pool with different bin step', async () => {
      const wbtcToken = getTestToken('TESTWBTC');
      const binStep = 20;
      const ratePrice = 2000;

      const existingPool = findTestPool('TESTWBTC', 'wSOL', binStep);
      if (existingPool) {
        console.log(`Pool found in test data: ${existingPool.pair}`);

        const poolMetadata = await lbServices.getPoolMetadata(existingPool.pair);
        expect(poolMetadata.baseToken.mintAddress).toBe(wbtcToken.mintAddress);
        expect(poolMetadata.quoteToken.mintAddress).toBe(WSOL_MINT);
        expect(poolMetadata.baseToken.decimals).toBe(wbtcToken.decimals);
        expect(poolMetadata.quoteToken.decimals).toBe(WSOL_DECIMALS);

        return;
      }

      const result = await createOrVerifyPool(
        lbServices,
        connection,
        testWallet,
        {
          baseToken: { mintAddress: wbtcToken.mintAddress, decimals: wbtcToken.decimals },
          quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
          binStep,
          ratePrice,
          payer: testWallet.keypair.publicKey,
        },
        'TESTWBTC/wSOL'
      );

      expect(result.pair).toBeDefined();
      expect(result.activeBin).toBeGreaterThan(0);
    });

    it('should validate pool metadata fields', async () => {
      // Test metadata structure using an existing pool
      const sarosToken = getTestToken('SAROSDEV');
      const existingPool = findTestPool('SAROSDEV', 'wSOL', 25);

      let poolAddress: string;

      if (existingPool) {
        poolAddress = existingPool.pair;
      } else {
        // Create pool if none exists
        const result = await createOrVerifyPool(
          lbServices,
          connection,
          testWallet,
          {
            baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
            quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
            binStep: 25,
            ratePrice: 0.00001,
            payer: testWallet.keypair.publicKey,
          },
          'SAROSDEV/wSOL (metadata test)'
        );
        poolAddress = result.pair;
      }

      const metadata = await lbServices.getPoolMetadata(poolAddress);

      // Validate all required metadata fields
      expect(metadata.poolAddress).toBe(poolAddress);
      expect(metadata.baseToken.mintAddress).toBeDefined();
      expect(metadata.baseToken.decimals).toBeGreaterThan(0);
      expect(metadata.baseToken.reserve).toBeDefined();
      expect(metadata.quoteToken.mintAddress).toBeDefined();
      expect(metadata.quoteToken.decimals).toBeGreaterThan(0);
      expect(metadata.quoteToken.reserve).toBeDefined();
      expect(metadata.tradeFee).toBeGreaterThanOrEqual(0);

      console.log('Pool metadata structure validated');
    });

    it('should validate transaction construction without execution', async () => {
      // Test that we can construct valid transactions
      const sarosToken = getTestToken('SAROSDEV');

      const createPoolResult = await lbServices.createPool({
        baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
        quoteToken: { mintAddress: WSOL_MINT, decimals: WSOL_DECIMALS },
        binStep: 10, // Different bin step to avoid conflicts
        ratePrice: 0.00001,
        payer: testWallet.keypair.publicKey,
      });

      // Validate transaction structure
      expect(createPoolResult.transaction).toBeDefined();
      expect(createPoolResult.pair).toBeDefined();
      expect(createPoolResult.activeBin).toBeGreaterThan(0);
      expect(createPoolResult.binArrayLower).toBeDefined();
      expect(createPoolResult.binArrayUpper).toBeDefined();

      console.log('Transaction construction validated');
    });
  });
});
