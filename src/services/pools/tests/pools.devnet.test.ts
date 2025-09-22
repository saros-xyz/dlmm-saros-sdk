import { describe, expect, it, beforeAll } from 'vitest';
import { SarosDLMM } from '../../..';
import { MODE } from '../../../types';
import {
  getTestWallet,
  getTestConnection,
  getTestToken,
  getSolBalance,
} from '../../../test/setup/test-helpers';

describe('Pool Creation', () => {
  let lbServices: SarosDLMM;
  let testWallet: any;
  let connection: any;

  beforeAll(() => {
    testWallet = getTestWallet();
    connection = getTestConnection();

    lbServices = new SarosDLMM({
      mode: MODE.DEVNET,
      options: {
        rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      },
    });

    console.log(`Using test wallet: ${testWallet.address}`);
    console.log(
      `Available tokens: ${testWallet.tokens.map((t: { symbol: any }) => t.symbol).join(', ')}`
    );
  });

  describe('createPool validation', () => {
    it('should reject invalid rate price (zero)', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: {
            mintAddress: sarosToken.mintAddress,
            decimals: sarosToken.decimals,
          },
          quoteToken: {
            mintAddress: usdcToken.mintAddress,
            decimals: usdcToken.decimals,
          },
          binStep: 25,
          ratePrice: 0, // Invalid price
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid rate price (negative)', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: {
            mintAddress: sarosToken.mintAddress,
            decimals: sarosToken.decimals,
          },
          quoteToken: {
            mintAddress: usdcToken.mintAddress,
            decimals: usdcToken.decimals,
          },
          binStep: 25,
          ratePrice: -1, // Invalid price
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid bin step (too small)', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: {
            mintAddress: sarosToken.mintAddress,
            decimals: sarosToken.decimals,
          },
          quoteToken: {
            mintAddress: usdcToken.mintAddress,
            decimals: usdcToken.decimals,
          },
          binStep: 0, // Invalid bin step
          ratePrice: 1.0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid bin step (too large)', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      await expect(
        lbServices.createPool({
          baseToken: {
            mintAddress: sarosToken.mintAddress,
            decimals: sarosToken.decimals,
          },
          quoteToken: {
            mintAddress: usdcToken.mintAddress,
            decimals: usdcToken.decimals,
          },
          binStep: 10001, // Invalid bin step
          ratePrice: 1.0,
          payer: testWallet.keypair.publicKey,
        })
      ).rejects.toThrow();
    });
  });

  describe('createPool success cases', () => {
    it('should successfully create SAROSDEV/TESTUSDC pool', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      // Check wallet has sufficient SOL for transaction fees
      const solBalance = await getSolBalance(connection, testWallet.keypair.publicKey);
      expect(solBalance).toBeGreaterThan(0.1); // Need SOL for transaction fees

      const createPoolResult = await lbServices.createPool({
        baseToken: {
          mintAddress: sarosToken.mintAddress,
          decimals: sarosToken.decimals,
        },
        quoteToken: {
          mintAddress: usdcToken.mintAddress,
          decimals: usdcToken.decimals,
        },
        binStep: 25, // 0.25% fee tier
        ratePrice: 0.5, // 1 SAROSDEV = 0.5 TESTUSDC
        payer: testWallet.keypair.publicKey,
      });

      // Validate the response structure
      expect(createPoolResult).toHaveProperty('tx');
      expect(createPoolResult).toHaveProperty('pair');
      expect(createPoolResult).toHaveProperty('binArrayLower');
      expect(createPoolResult).toHaveProperty('binArrayUpper');
      expect(createPoolResult).toHaveProperty('hooksConfig');
      expect(createPoolResult).toHaveProperty('activeBin');

      // Validate the transaction object
      expect(createPoolResult.tx).toBeDefined();
      expect(createPoolResult.tx.instructions.length).toBeGreaterThan(0);

      // Validate addresses are valid base58 strings
      expect(createPoolResult.pair).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult.binArrayLower).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult.binArrayUpper).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult.hooksConfig).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

      // Validate activeBin is a number
      expect(typeof createPoolResult.activeBin).toBe('number');
      expect(createPoolResult.activeBin).toBeGreaterThan(0);

      console.log(`Created pool: ${createPoolResult.pair}`);
      console.log(`Active bin: ${createPoolResult.activeBin}`);
      console.log(
        `Bin arrays: ${createPoolResult.binArrayLower}, ${createPoolResult.binArrayUpper}`
      );

      // Note: We're not signing and sending the transaction in tests to avoid
      // actually creating pools on devnet, but we validate the transaction structure
    });

    it('should create different pools with different bin steps', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const wbtcToken = getTestToken('TESTWBTC');

      const createPoolResult1 = await lbServices.createPool({
        baseToken: {
          mintAddress: sarosToken.mintAddress,
          decimals: sarosToken.decimals,
        },
        quoteToken: {
          mintAddress: wbtcToken.mintAddress,
          decimals: wbtcToken.decimals,
        },
        binStep: 10, // 0.1% fee tier
        ratePrice: 0.0001, // 1 SAROSDEV = 0.0001 TESTWBTC
        payer: testWallet.keypair.publicKey,
      });

      const createPoolResult2 = await lbServices.createPool({
        baseToken: {
          mintAddress: sarosToken.mintAddress,
          decimals: sarosToken.decimals,
        },
        quoteToken: {
          mintAddress: wbtcToken.mintAddress,
          decimals: wbtcToken.decimals,
        },
        binStep: 100, // 1% fee tier
        ratePrice: 0.0001, // Same price, different bin step
        payer: testWallet.keypair.publicKey,
      });

      // Different bin steps should create different pool addresses
      expect(createPoolResult1.pair).not.toBe(createPoolResult2.pair);

      // But both should be valid
      expect(createPoolResult1.pair).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult2.pair).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

      console.log(`Pool with binStep 10: ${createPoolResult1.pair}`);
      console.log(`Pool with binStep 100: ${createPoolResult2.pair}`);
    });

    it('should handle different token decimal combinations', async () => {
      const usdcToken = getTestToken('TESTUSDC'); // 6 decimals
      const wbtcToken = getTestToken('TESTWBTC'); // 8 decimals

      const createPoolResult = await lbServices.createPool({
        baseToken: {
          mintAddress: wbtcToken.mintAddress,
          decimals: wbtcToken.decimals,
        },
        quoteToken: {
          mintAddress: usdcToken.mintAddress,
          decimals: usdcToken.decimals,
        },
        binStep: 50, // 0.5% fee tier
        ratePrice: 50000, // 1 TESTWBTC = 50,000 TESTUSDC
        payer: testWallet.keypair.publicKey,
      });

      expect(createPoolResult.pair).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult.activeBin).toBeGreaterThan(0);

      console.log(`WBTC/USDC pool: ${createPoolResult.pair}`);
      console.log(`Active bin: ${createPoolResult.activeBin}`);
    });
  });

  describe('edge cases', () => {
    it('should handle very small rate prices', async () => {
      const sarosToken = getTestToken('SAROSDEV');
      const usdcToken = getTestToken('TESTUSDC');

      const createPoolResult = await lbServices.createPool({
        baseToken: {
          mintAddress: sarosToken.mintAddress,
          decimals: sarosToken.decimals,
        },
        quoteToken: {
          mintAddress: usdcToken.mintAddress,
          decimals: usdcToken.decimals,
        },
        binStep: 25,
        ratePrice: 0.000001, // Very small price
        payer: testWallet.keypair.publicKey,
      });

      expect(createPoolResult.pair).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(createPoolResult.activeBin).toBeGreaterThan(0);
    });
  });
});
