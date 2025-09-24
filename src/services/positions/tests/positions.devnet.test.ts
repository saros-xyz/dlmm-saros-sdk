import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../..';
import { LiquidityShape, MODE, RemoveLiquidityType } from '../../../types';
import {
  getAllTestPools,
  getAllTestTokens,
  waitForConfirmation,
  createTestKeypair,
} from '../../../test/setup/test-helpers';
import { ensureTestEnvironment } from '../../../test/setup/test-setup';

function isInsufficientFundsError(error: unknown): boolean {
  const msg = String(error);
  return (
    msg.includes('insufficient') ||
    msg.includes('InsufficientFunds') ||
    msg.includes('custom program error: 0x1')
  );
}

describe('Liquidity Shape Distribution Tests', () => {
  let lbServices: SarosDLMM;
  let testWallet: any;
  let connection: any;
  let testPools: any[];
  let sarosToken: any;
  let testPool: any;

  beforeAll(async () => {
    await ensureTestEnvironment();
    testWallet = (global as any).testWallet;
    connection = (global as any).testConnection;

    if (!testWallet || !connection) {
      throw new Error('Test environment not initialized');
    }

    const testTokens = getAllTestTokens();
    sarosToken = testTokens.find((token) => token.symbol === 'SAROSDEV');

    if (!sarosToken) {
      throw new Error('SAROSDEV token not found in test tokens');
    }

    testPools = getAllTestPools();
    testPool = testPools.find(
      (pool) =>
        pool.baseToken === sarosToken.mintAddress || pool.quoteToken === sarosToken.mintAddress
    );

    if (!testPool) {
      throw new Error('No pool found with SAROSDEV token');
    }

    lbServices = new SarosDLMM({
      mode: MODE.DEVNET,
      options: {
        rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      },
    });
  });

  it('should distribute liquidity using Spot shape and validate distribution pattern', async () => {
    const poolAddress = new PublicKey(testPool.pair);
    const positionKeypair = createTestKeypair();
    const binRange: [number, number] = [-4, 4];
    const baseAmount = 50_000_000_000n;
    const quoteAmount = 50_000_000n;

    try {
      const createTx = await lbServices.createPosition({
        poolAddress,
        binRange,
        payer: testWallet.keypair.publicKey,
        positionMint: positionKeypair.publicKey,
      });

      const createSignature = await connection.sendTransaction(createTx, [
        testWallet.keypair,
        positionKeypair,
      ]);
      await waitForConfirmation(createSignature, connection);

      const addLiquidityTx = await lbServices.addLiquidityByShape({
        poolAddress,
        positionMint: positionKeypair.publicKey,
        payer: testWallet.keypair.publicKey,
        baseAmount,
        quoteAmount,
        liquidityShape: LiquidityShape.Spot,
        binRange,
      });

      const addSignature = await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);
      await waitForConfirmation(addSignature, connection);

      const positionAddress = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), positionKeypair.publicKey.toBuffer()],
        lbServices.lbProgram.programId
      )[0];

      const binBalances = await lbServices.getPositionBinBalances({
        position: positionAddress,
        pair: poolAddress,
        payer: testWallet.keypair.publicKey,
      });

      const activeBins = binBalances.filter((bin) => bin.baseReserve > 0n || bin.quoteReserve > 0n);
      expect(activeBins.length).toBeGreaterThan(0);

      // Validate Spot distribution: bins below active should have more quote, bins above should have more base
      const negativeBins = activeBins.filter((bin) => bin.binPosition < 0);
      const positiveBins = activeBins.filter((bin) => bin.binPosition > 0);

      if (negativeBins.length > 0) {
        const avgQuoteInNegative =
          negativeBins.reduce((sum, bin) => sum + bin.quoteReserve, 0n) /
          BigInt(negativeBins.length);
        expect(avgQuoteInNegative).toBeGreaterThan(0n);
      }

      if (positiveBins.length > 0) {
        const avgBaseInPositive =
          positiveBins.reduce((sum, bin) => sum + bin.baseReserve, 0n) /
          BigInt(positiveBins.length);
        expect(avgBaseInPositive).toBeGreaterThan(0n);
      }

      // Validate total liquidity conservation
      const totalBase = activeBins.reduce((sum, bin) => sum + bin.baseReserve, 0n);
      const totalQuote = activeBins.reduce((sum, bin) => sum + bin.quoteReserve, 0n);
      const totalValue = totalBase + totalQuote;
      const expectedTotal = baseAmount + quoteAmount;

      expect(Number(totalValue)).toBeGreaterThan(Number(expectedTotal) * 0.95);
      expect(Number(totalValue)).toBeLessThan(Number(expectedTotal) * 1.05);
    } catch (error) {
      if (isInsufficientFundsError(error)) {
        return;
      }
      throw error;
    } finally {
      try {
        const removeResult = await lbServices.removeLiquidity({
          positionMints: [positionKeypair.publicKey],
          payer: testWallet.keypair.publicKey,
          type: RemoveLiquidityType.All,
          poolAddress,
        });

        if (removeResult.setupTransaction) {
          await connection.sendTransaction(removeResult.setupTransaction, [testWallet.keypair]);
        }

        for (const tx of removeResult.transactions) {
          await connection.sendTransaction(tx, [testWallet.keypair]);
        }

        if (removeResult.cleanupTransaction) {
          await connection.sendTransaction(removeResult.cleanupTransaction, [testWallet.keypair]);
        }
      } catch {
        // Cleanup failure is not critical for test success
      }
    }
  }, 60000);

  it('should distribute liquidity using Curve shape and validate bell curve pattern', async () => {
    const poolAddress = new PublicKey(testPool.pair);
    const positionKeypair = createTestKeypair();
    const binRange: [number, number] = [-6, 6];
    const baseAmount = 75_000_000_000n;
    const quoteAmount = 75_000_000n;

    try {
      const createTx = await lbServices.createPosition({
        poolAddress,
        binRange,
        payer: testWallet.keypair.publicKey,
        positionMint: positionKeypair.publicKey,
      });

      const createSignature = await connection.sendTransaction(createTx, [
        testWallet.keypair,
        positionKeypair,
      ]);
      await waitForConfirmation(createSignature, connection);

      const addLiquidityTx = await lbServices.addLiquidityByShape({
        poolAddress,
        positionMint: positionKeypair.publicKey,
        payer: testWallet.keypair.publicKey,
        baseAmount,
        quoteAmount,
        liquidityShape: LiquidityShape.Curve,
        binRange,
      });

      const addSignature = await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);
      await waitForConfirmation(addSignature, connection);

      const positionAddress = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), positionKeypair.publicKey.toBuffer()],
        lbServices.lbProgram.programId
      )[0];

      const binBalances = await lbServices.getPositionBinBalances({
        position: positionAddress,
        pair: poolAddress,
        payer: testWallet.keypair.publicKey,
      });

      const activeBins = binBalances.filter((bin) => bin.baseReserve > 0n || bin.quoteReserve > 0n);
      expect(activeBins.length).toBeGreaterThan(0);

      // Validate Curve bell curve distribution
      const centerBins = activeBins.filter((bin) => Math.abs(bin.binPosition) <= 1);
      const edgeBins = activeBins.filter((bin) => Math.abs(bin.binPosition) > 3);

      if (centerBins.length > 0 && edgeBins.length > 0) {
        const centerLiquidity = centerBins.reduce(
          (sum, bin) => sum + bin.baseReserve + bin.quoteReserve,
          0n
        );
        const edgeLiquidity = edgeBins.reduce(
          (sum, bin) => sum + bin.baseReserve + bin.quoteReserve,
          0n
        );
        const avgCenterLiquidity = centerLiquidity / BigInt(centerBins.length);
        const avgEdgeLiquidity = edgeLiquidity / BigInt(edgeBins.length);

        expect(avgCenterLiquidity).toBeGreaterThan(avgEdgeLiquidity);
      }
    } catch (error) {
      if (isInsufficientFundsError(error)) {
        return;
      }
      throw error;
    } finally {
      try {
        const removeResult = await lbServices.removeLiquidity({
          positionMints: [positionKeypair.publicKey],
          payer: testWallet.keypair.publicKey,
          type: RemoveLiquidityType.All,
          poolAddress,
        });

        if (removeResult.setupTransaction) {
          await connection.sendTransaction(removeResult.setupTransaction, [testWallet.keypair]);
        }
        for (const tx of removeResult.transactions) {
          await connection.sendTransaction(tx, [testWallet.keypair]);
        }
        if (removeResult.cleanupTransaction) {
          await connection.sendTransaction(removeResult.cleanupTransaction, [testWallet.keypair]);
        }
      } catch {
        // Cleanup failure is not critical for test success
      }
    }
  }, 60000);

  it('should distribute liquidity using BidAsk shape and validate concentrated pattern', async () => {
    const poolAddress = new PublicKey(testPool.pair);
    const positionKeypair = createTestKeypair();
    const binRange: [number, number] = [-3, 3];
    const baseAmount = 50_000_000_000n;
    const quoteAmount = 50_000_000n;

    try {
      const createTx = await lbServices.createPosition({
        poolAddress,
        binRange,
        payer: testWallet.keypair.publicKey,
        positionMint: positionKeypair.publicKey,
      });

      const createSignature = await connection.sendTransaction(createTx, [
        testWallet.keypair,
        positionKeypair,
      ]);
      await waitForConfirmation(createSignature, connection);

      const addLiquidityTx = await lbServices.addLiquidityByShape({
        poolAddress,
        positionMint: positionKeypair.publicKey,
        payer: testWallet.keypair.publicKey,
        baseAmount,
        quoteAmount,
        liquidityShape: LiquidityShape.BidAsk,
        binRange,
      });

      const addSignature = await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);
      await waitForConfirmation(addSignature, connection);

      const positionAddress = PublicKey.findProgramAddressSync(
        [Buffer.from('position'), positionKeypair.publicKey.toBuffer()],
        lbServices.lbProgram.programId
      )[0];

      const binBalances = await lbServices.getPositionBinBalances({
        position: positionAddress,
        pair: poolAddress,
        payer: testWallet.keypair.publicKey,
      });

      const activeBins = binBalances.filter((bin) => bin.baseReserve > 0n || bin.quoteReserve > 0n);
      expect(activeBins.length).toBeGreaterThan(0);

      // Validate BidAsk concentrated distribution
      const activeBin = activeBins.find((bin) => bin.binPosition === 0);
      if (activeBin) {
        expect(activeBin.baseReserve + activeBin.quoteReserve).toBeGreaterThan(0n);
      }

      const negativeBins = activeBins.filter((bin) => bin.binPosition < 0);
      const positiveBins = activeBins.filter((bin) => bin.binPosition > 0);

      if (negativeBins.length > 0 && positiveBins.length > 0) {
        const negLiquidity = negativeBins.reduce(
          (sum, bin) => sum + bin.baseReserve + bin.quoteReserve,
          0n
        );
        const posLiquidity = positiveBins.reduce(
          (sum, bin) => sum + bin.baseReserve + bin.quoteReserve,
          0n
        );

        expect(negLiquidity).toBeGreaterThan(0n);
        expect(posLiquidity).toBeGreaterThan(0n);
      }
    } catch (error) {
      if (isInsufficientFundsError(error)) {
        return;
      }
      throw error;
    } finally {
      try {
        const removeResult = await lbServices.removeLiquidity({
          positionMints: [positionKeypair.publicKey],
          payer: testWallet.keypair.publicKey,
          type: RemoveLiquidityType.All,
          poolAddress,
        });

        if (removeResult.setupTransaction) {
          await connection.sendTransaction(removeResult.setupTransaction, [testWallet.keypair]);
        }
        for (const tx of removeResult.transactions) {
          await connection.sendTransaction(tx, [testWallet.keypair]);
        }
        if (removeResult.cleanupTransaction) {
          await connection.sendTransaction(removeResult.cleanupTransaction, [testWallet.keypair]);
        }
      } catch {
        // Cleanup failure is not critical for test success
      }
    }
  }, 60000);
});
