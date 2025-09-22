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
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
          quoteToken: { mintAddress: usdcToken.mintAddress, decimals: usdcToken.decimals },
          binStep: 25,
          ratePrice: 0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid bin step', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
          quoteToken: { mintAddress: usdcToken.mintAddress, decimals: usdcToken.decimals },
          binStep: 0,
          ratePrice: 1.0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });
  });

  describe('end-to-end pool creation', () => {
    it('should create and verify SAROSDEV/TESTUSDC pool', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');
      const binStep = 25;
      const ratePrice = 0.5;

      const existingPool = findTestPool('SAROSDEV', 'TESTUSDC', binStep);
      if (existingPool) {
        console.log(`Pool already exists: ${existingPool.pair}`);
        
        const poolMetadata = await lbServices.getPoolMetadata(existingPool.pair);
        expect(poolMetadata.baseToken.mintAddress).toBe(sarosToken.mintAddress);
        expect(poolMetadata.quoteToken.mintAddress).toBe(usdcToken.mintAddress);
        
        return;
      }

      const createPoolResult = await lbServices.createPool({
        baseToken: { mintAddress: sarosToken.mintAddress, decimals: sarosToken.decimals },
        quoteToken: { mintAddress: usdcToken.mintAddress, decimals: usdcToken.decimals },
        binStep,
        ratePrice,
        payer: testWallet.keypair.publicKey,
      });

      console.log('Creating pool on-chain...');
      const signature = await connection.sendTransaction(createPoolResult.tx, [testWallet.keypair]);
      await waitForConfirmation(signature, connection);

      console.log(`Pool created: ${createPoolResult.pair}`);
      console.log(`Transaction: ${signature}`);

      const poolMetadata = await lbServices.getPoolMetadata(createPoolResult.pair);
      
      expect(poolMetadata.baseToken.mintAddress).toBe(sarosToken.mintAddress);
      expect(poolMetadata.quoteToken.mintAddress).toBe(usdcToken.mintAddress);
      expect(poolMetadata.baseToken.decimals).toBe(sarosToken.decimals);
      expect(poolMetadata.quoteToken.decimals).toBe(usdcToken.decimals);
      // expect(poolMetadata.activeBin).toBe(createPoolResult.activeBin);

      saveTestPool({
        pair: createPoolResult.pair,
        baseToken: sarosToken.mintAddress,
        quoteToken: usdcToken.mintAddress,
        binStep,
        ratePrice,
        activeBin: createPoolResult.activeBin,
        binArrayLower: createPoolResult.binArrayLower,
        binArrayUpper: createPoolResult.binArrayUpper,
        signature
      });

      console.log('Pool metadata verified and saved');
    });

    it('should create and verify TESTWBTC/TESTUSDC pool with different bin step', async () => {
      const wbtcToken = getTestToken('TESTWBTC');
      const usdcToken = getTestToken('TESTUSDC');
      const binStep = 50;
      const ratePrice = 50000;

      const existingPool = findTestPool('TESTWBTC', 'TESTUSDC', binStep);
      if (existingPool) {
        console.log(`Pool already exists: ${existingPool.pair}`);
        
        const poolMetadata = await lbServices.getPoolMetadata(existingPool.pair);
        expect(poolMetadata.baseToken.mintAddress).toBe(wbtcToken.mintAddress);
        expect(poolMetadata.quoteToken.mintAddress).toBe(usdcToken.mintAddress);
        
        return;
      }

      const createPoolResult = await lbServices.createPool({
        baseToken: { mintAddress: wbtcToken.mintAddress, decimals: wbtcToken.decimals },
        quoteToken: { mintAddress: usdcToken.mintAddress, decimals: usdcToken.decimals },
        binStep,
        ratePrice,
        payer: testWallet.keypair.publicKey,
      });

      console.log('Creating WBTC/USDC pool on-chain...');
      const signature = await connection.sendTransaction(createPoolResult.tx, [testWallet.keypair]);
      await waitForConfirmation(signature, connection);

      const poolMetadata = await lbServices.getPoolMetadata(createPoolResult.pair);
      expect(poolMetadata.baseToken.mintAddress).toBe(wbtcToken.mintAddress);
      expect(poolMetadata.quoteToken.mintAddress).toBe(usdcToken.mintAddress);

      saveTestPool({
        pair: createPoolResult.pair,
        baseToken: wbtcToken.mintAddress,
        quoteToken: usdcToken.mintAddress,
        binStep,
        ratePrice,
        activeBin: createPoolResult.activeBin,
        binArrayLower: createPoolResult.binArrayLower,
        binArrayUpper: createPoolResult.binArrayUpper,
        signature
      });

      console.log(`WBTC/USDC pool verified: ${createPoolResult.pair}`);
    });
  });
});