/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it, beforeAll } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../..';
import { LiquidityShape, MODE, RemoveLiquidityType } from '../../../types';
import {
  getAllTestPools,
  waitForConfirmation,
  createTestKeypair,
} from '../../../test/setup/test-helpers';
import { ensureTestEnvironment } from '../../../test/setup/test-setup';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Transaction logging types
interface PositionTransaction {
  type: 'create_position' | 'add_liquidity' | 'remove_liquidity';
  signature: string;
  poolAddress: string;
  positionMint?: string;
  binRange?: [number, number];
  baseAmount?: string;
  quoteAmount?: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface TransactionLog {
  positions: PositionTransaction[];
}

// Logging utilities
function loadTransactionLog(): TransactionLog {
  const logPath = join(process.cwd(), 'test-data/position-transactions.json');
  return existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { positions: [] };
}

function saveTransactionLog(log: TransactionLog): void {
  const logPath = join(process.cwd(), 'test-data/position-transactions.json');
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, JSON.stringify(log, null, 2));
}

function logTransaction(transaction: Omit<PositionTransaction, 'timestamp'>): void {
  const log = loadTransactionLog();
  log.positions.push({ ...transaction, timestamp: new Date().toISOString() });
  saveTransactionLog(log);
}

function isInsufficientFundsError(error: unknown): boolean {
  const msg = String(error);
  return (
    msg.includes('insufficient') ||
    msg.includes('InsufficientFunds') ||
    msg.includes('custom program error: 0x1')
  );
}

describe('Position Management Integration', () => {
  let lbServices: SarosDLMM;
  let testWallet: any;
  let connection: any;
  let testPools: any[];

  beforeAll(async () => {
    await ensureTestEnvironment();
    testWallet = (global as any).testWallet;
    connection = (global as any).testConnection;

    if (!testWallet || !connection) {
      throw new Error('Test environment not initialized');
    }

    testPools = getAllTestPools();
    if (testPools.length === 0) {
      throw new Error('No test pools available. Run pool creation tests first.');
    }

    console.log(`Testing with ${testPools.length} available pools`);
  });

  beforeAll(() => {
    lbServices = new SarosDLMM({
      mode: MODE.DEVNET,
      options: {
        rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      },
    });
  });

  // describe('position creation', () => {
  //   it('should create positions with different bin ranges', async () => {
  //     const pool = testPools[0];
  //     const testCases = [
  //       { binRange: [-5, 5] as [number, number], name: 'symmetric range' },
  //       { binRange: [0, 10] as [number, number], name: 'right side only' },
  //       { binRange: [-10, 0] as [number, number], name: 'left side only' },
  //     ];

  //     for (const testCase of testCases) {
  //       // Create full keypair for position mint
  //       const positionMintKeypair = createTestKeypair();

  //       try {
  //         console.log(`Creating ${testCase.name} position...`);

  //         const createTx = await lbServices.createPosition({
  //           poolAddress: new PublicKey(pool.pair),
  //           binRange: testCase.binRange,
  //           payer: testWallet.keypair.publicKey,
  //           positionMint: positionMintKeypair.publicKey,
  //         });

  //         // Include position mint keypair in signers
  //         const signature = await connection.sendTransaction(createTx, [
  //           testWallet.keypair,
  //           positionMintKeypair,
  //         ]);
  //         await waitForConfirmation(signature, connection);

  //         logTransaction({
  //           type: 'create_position',
  //           signature,
  //           poolAddress: pool.pair,
  //           positionMint: positionMintKeypair.publicKey.toString(),
  //           binRange: testCase.binRange,
  //           success: true,
  //         });

  //         console.log(`✓ ${testCase.name}: ${signature.slice(0, 8)}...`);

  //         // Verify position was created
  //         const positionAddress = PublicKey.findProgramAddressSync(
  //           [Buffer.from('position'), positionMintKeypair.publicKey.toBuffer()],
  //           lbServices.lbProgram.programId
  //         )[0];

  //         const positionAccount = await lbServices.getPositionAccount(positionAddress);
  //         expect(positionAccount.pair.toString()).toBe(pool.pair);
  //       } catch (error) {
  //         console.log(`✗ ${testCase.name}: ${error}`);

  //         logTransaction({
  //           type: 'create_position',
  //           signature: 'failed',
  //           poolAddress: pool.pair,
  //           positionMint: positionMintKeypair.publicKey.toString(),
  //           binRange: testCase.binRange,
  //           success: false,
  //           error: String(error),
  //         });
  //       }
  //     }
  //   });
  // });

  describe('liquidity addition', () => {
    it('should add liquidity to positions', async () => {
      const pool = testPools[0];
      const positionMintKeypair = createTestKeypair();
      const binRange: [number, number] = [-3, 3];

      try {
        // Create position first
        console.log('Creating position for liquidity test...');
        const createTx = await lbServices.createPosition({
          poolAddress: new PublicKey(pool.pair),
          binRange,
          payer: testWallet.keypair.publicKey,
          positionMint: positionMintKeypair.publicKey,
        });

        const createSig = await connection.sendTransaction(createTx, [
          testWallet.keypair,
          positionMintKeypair,
        ]);
        await waitForConfirmation(createSig, connection);

        // Test liquidity amounts
        const liquidityTests = [
          { baseAmount: 100000n, quoteAmount: 100000n, name: 'small' }, // 0.1M each (0.1 SOL)
          // { baseAmount: 200000n, quoteAmount: 200000n, name: 'medium' }, // 0.2M each (0.2 SOL)
        ];

        for (const test of liquidityTests) {
          try {
            console.log(`Adding ${test.name} liquidity`);
            console.log(`Adding ${test.baseAmount} base token`);
            console.log(`Adding ${test.quoteAmount} quote token`);

            const addLiquidityTx = await lbServices.addLiquidityByShape({
              poolAddress: new PublicKey(pool.pair),
              positionMint: positionMintKeypair.publicKey,
              payer: testWallet.keypair.publicKey,
              baseAmount: test.baseAmount,
              quoteAmount: test.quoteAmount,
              liquidityShape: LiquidityShape.Spot,
              binRange,
            });

            const signature = await connection.sendTransaction(addLiquidityTx, [
              testWallet.keypair,
            ]);
            await waitForConfirmation(signature, connection);

            logTransaction({
              type: 'add_liquidity',
              signature,
              poolAddress: pool.pair,
              positionMint: positionMintKeypair.publicKey.toString(),
              baseAmount: test.baseAmount.toString(),
              quoteAmount: test.quoteAmount.toString(),
              success: true,
            });

            console.log(`✓ ${test.name} liquidity: ${signature.slice(0, 8)}...`);
          } catch (error) {
            if (isInsufficientFundsError(error)) {
              console.log(`⚠ ${test.name} liquidity: insufficient funds`);
              continue;
            }

            console.log(`✗ ${test.name} liquidity: ${error}`);

            logTransaction({
              type: 'add_liquidity',
              signature: 'failed',
              poolAddress: pool.pair,
              positionMint: positionMintKeypair.publicKey.toString(),
              baseAmount: test.baseAmount.toString(),
              quoteAmount: test.quoteAmount.toString(),
              success: false,
              error: String(error),
            });
          }
        }
      } catch (error) {
        console.log(`Position creation failed: ${error}`);
      }
    });

    // it('should verify position balances after liquidity addition', async () => {
    //   const pool = testPools[0];
    //   const positionMintKeypair = createTestKeypair();
    //   const binRange: [number, number] = [-3, 3];

    //   try {
    //     // Create position
    //     const createTx = await lbServices.createPosition({
    //       poolAddress: new PublicKey(pool.pair),
    //       binRange,
    //       payer: testWallet.keypair.publicKey,
    //       positionMint: positionMintKeypair.publicKey,
    //     });

    //     await connection.sendTransaction(createTx, [testWallet.keypair, positionMintKeypair]);

    //     // Add liquidity
    //     const addLiquidityTx = await lbServices.addLiquidityByShape({
    //       poolAddress: new PublicKey(pool.pair),
    //       positionMint: positionMintKeypair.publicKey,
    //       payer: testWallet.keypair.publicKey,
    //       baseAmount: 2000000n,
    //       quoteAmount: 2000000n,
    //       liquidityShape: LiquidityShape.Spot,
    //       binRange,
    //     });

    //     await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);

    //     // Check balances
    //     const positionAddress = PublicKey.findProgramAddressSync(
    //       [Buffer.from('position'), positionMintKeypair.publicKey.toBuffer()],
    //       lbServices.lbProgram.programId
    //     )[0];

    //     const binBalances = await lbServices.getPositionBinBalances({
    //       position: positionAddress,
    //       pair: new PublicKey(pool.pair),
    //       payer: testWallet.keypair.publicKey,
    //     });

    //     const totalBase = binBalances.reduce((sum, b) => sum + b.baseReserve, 0n);
    //     const totalQuote = binBalances.reduce((sum, b) => sum + b.quoteReserve, 0n);

    //     console.log(`Position balances - Base: ${totalBase}, Quote: ${totalQuote}`);
    //     expect(totalBase + totalQuote).toBeGreaterThan(0n);
    //   } catch (error) {
    //     if (!isInsufficientFundsError(error)) {
    //       console.log(`Balance verification failed: ${error}`);
    //     }
    //   }
    // });
  });

  // describe('liquidity removal', () => {
  //   it('should remove liquidity from positions', async () => {
  //     const pool = testPools[0];
  //     const positionMintKeypair = createTestKeypair();
  //     const binRange: [number, number] = [-5, 5];

  //     try {
  //       // Create and fund position
  //       console.log('Creating position for removal test...');

  //       const createTx = await lbServices.createPosition({
  //         poolAddress: new PublicKey(pool.pair),
  //         binRange,
  //         payer: testWallet.keypair.publicKey,
  //         positionMint: positionMintKeypair.publicKey,
  //       });

  //       await connection.sendTransaction(createTx, [testWallet.keypair, positionMintKeypair]);

  //       const addLiquidityTx = await lbServices.addLiquidityByShape({
  //         poolAddress: new PublicKey(pool.pair),
  //         positionMint: positionMintKeypair.publicKey,
  //         payer: testWallet.keypair.publicKey,
  //         baseAmount: 5000000n,
  //         quoteAmount: 5000000n,
  //         liquidityShape: LiquidityShape.Spot,
  //         binRange,
  //       });

  //       await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);

  //       // Remove liquidity
  //       console.log('Removing liquidity...');

  //       const removeResult = await lbServices.removeLiquidity({
  //         positionMints: [positionMintKeypair.publicKey],
  //         payer: testWallet.keypair.publicKey,
  //         type: RemoveLiquidityType.All,
  //         poolAddress: new PublicKey(pool.pair),
  //       });

  //       // Execute setup transaction if needed
  //       if (removeResult.setupTransaction) {
  //         const setupSig = await connection.sendTransaction(removeResult.setupTransaction, [
  //           testWallet.keypair,
  //         ]);
  //         await waitForConfirmation(setupSig, connection);
  //         console.log(`✓ Setup tx: ${setupSig.slice(0, 8)}...`);
  //       }

  //       // Execute main removal transactions
  //       for (let i = 0; i < removeResult.transactions.length; i++) {
  //         const tx = removeResult.transactions[i];
  //         const signature = await connection.sendTransaction(tx, [testWallet.keypair]);
  //         await waitForConfirmation(signature, connection);

  //         logTransaction({
  //           type: 'remove_liquidity',
  //           signature,
  //           poolAddress: pool.pair,
  //           positionMint: positionMintKeypair.publicKey.toString(),
  //           success: true,
  //         });

  //         console.log(`✓ Removal tx ${i + 1}: ${signature.slice(0, 8)}...`);
  //       }

  //       // Execute cleanup transaction if needed
  //       if (removeResult.cleanupTransaction) {
  //         const cleanupSig = await connection.sendTransaction(removeResult.cleanupTransaction, [
  //           testWallet.keypair,
  //         ]);
  //         await waitForConfirmation(cleanupSig, connection);
  //         console.log(`✓ Cleanup tx: ${cleanupSig.slice(0, 8)}...`);
  //       }

  //       console.log(`Closed ${removeResult.closedPositions.length} positions`);
  //     } catch (error) {
  //       if (!isInsufficientFundsError(error)) {
  //         console.log(`Liquidity removal failed: ${error}`);

  //         logTransaction({
  //           type: 'remove_liquidity',
  //           signature: 'failed',
  //           poolAddress: pool.pair,
  //           positionMint: positionMintKeypair.publicKey.toString(),
  //           success: false,
  //           error: String(error),
  //         });
  //       }
  //     }
  //   });
  // });

  // describe('user position queries', () => {
  //   it('should retrieve user positions', async () => {
  //     for (const pool of testPools.slice(0, 2)) {
  //       try {
  //         const positions = await lbServices.getUserPositions({
  //           payer: testWallet.keypair.publicKey,
  //           poolAddress: new PublicKey(pool.pair),
  //         });

  //         console.log(`Pool ${pool.pair.slice(0, 8)}...: ${positions.length} positions`);

  //         positions.forEach((pos, i) => {
  //           console.log(`  Position ${i + 1}: bins [${pos.lowerBinId}, ${pos.upperBinId}]`);
  //         });
  //       } catch (error) {
  //         console.log(`Failed to get positions for ${pool.pair.slice(0, 8)}...: ${error}`);
  //       }
  //     }
  //   });
  // });

  // describe('error handling', () => {
  //   it('should reject invalid bin ranges', async () => {
  //     const pool = testPools[0];
  //     const positionMintKeypair = createTestKeypair();

  //     // Test should expect rejection during transaction creation, not execution
  //     try {
  //       const createTx = await lbServices.createPosition({
  //         poolAddress: new PublicKey(pool.pair),
  //         binRange: [10, -10], // Invalid: left > right
  //         payer: testWallet.keypair.publicKey,
  //         positionMint: positionMintKeypair.publicKey,
  //       });

  //       // If we get here, the SDK should validate and throw during transaction execution
  //       await expect(
  //         connection.sendTransaction(createTx, [testWallet.keypair, positionMintKeypair])
  //       ).rejects.toThrow();

  //       console.log('✓ Invalid bin range properly rejected during execution');
  //     } catch (error) {
  //       // This is the preferred path - SDK should validate during createPosition call
  //       console.log('✓ Invalid bin range properly rejected during transaction creation');
  //       expect(String(error)).toContain('Invalid');
  //     }
  //   });

  //   it('should handle zero liquidity amounts', async () => {
  //     const pool = testPools[0];
  //     const positionMintKeypair = createTestKeypair();

  //     try {
  //       // Create position first
  //       const createTx = await lbServices.createPosition({
  //         poolAddress: new PublicKey(pool.pair),
  //         binRange: [-5, 5],
  //         payer: testWallet.keypair.publicKey,
  //         positionMint: positionMintKeypair.publicKey,
  //       });

  //       await connection.sendTransaction(createTx, [testWallet.keypair, positionMintKeypair]);

  //       // Try zero amounts - should be rejected by SDK
  //       await expect(
  //         lbServices.addLiquidityByShape({
  //           poolAddress: new PublicKey(pool.pair),
  //           positionMint: positionMintKeypair.publicKey,
  //           payer: testWallet.keypair.publicKey,
  //           baseAmount: 0n,
  //           quoteAmount: 0n,
  //           liquidityShape: LiquidityShape.Spot,
  //           binRange: [-5, 5],
  //         })
  //       ).rejects.toThrow();

  //       console.log('✓ Zero liquidity amounts properly rejected');
  //     } catch (error) {
  //       console.log(`Zero liquidity test setup failed: ${error}`);
  //     }
  //   });
  // });

  // describe('multiple removal types', () => {
  //   it('should test different removal types', async () => {
  //     const pool = testPools[0];
  //     const removalTypes = [
  //       { type: RemoveLiquidityType.All, name: 'all liquidity' },
  //       { type: RemoveLiquidityType.BaseToken, name: 'base token only' },
  //       { type: RemoveLiquidityType.QuoteToken, name: 'quote token only' },
  //     ];

  //     for (const removalTest of removalTypes) {
  //       const positionMintKeypair = createTestKeypair();
  //       const binRange: [number, number] = [-3, 3];

  //       try {
  //         console.log(`Testing ${removalTest.name} removal...`);

  //         // Create and fund position
  //         const createTx = await lbServices.createPosition({
  //           poolAddress: new PublicKey(pool.pair),
  //           binRange,
  //           payer: testWallet.keypair.publicKey,
  //           positionMint: positionMintKeypair.publicKey,
  //         });

  //         await connection.sendTransaction(createTx, [testWallet.keypair, positionMintKeypair]);

  //         const addLiquidityTx = await lbServices.addLiquidityByShape({
  //           poolAddress: new PublicKey(pool.pair),
  //           positionMint: positionMintKeypair.publicKey,
  //           payer: testWallet.keypair.publicKey,
  //           baseAmount: 3000000n,
  //           quoteAmount: 3000000n,
  //           liquidityShape: LiquidityShape.Spot,
  //           binRange,
  //         });

  //         await connection.sendTransaction(addLiquidityTx, [testWallet.keypair]);

  //         // Test removal
  //         const removeResult = await lbServices.removeLiquidity({
  //           positionMints: [positionMintKeypair.publicKey],
  //           payer: testWallet.keypair.publicKey,
  //           type: removalTest.type,
  //           poolAddress: new PublicKey(pool.pair),
  //         });

  //         expect(removeResult.transactions.length).toBeGreaterThan(0);
  //         console.log(
  //           `✓ ${removalTest.name}: ${removeResult.transactions.length} transactions generated`
  //         );
  //       } catch (error) {
  //         if (!isInsufficientFundsError(error)) {
  //           console.log(`✗ ${removalTest.name} failed: ${error}`);
  //         } else {
  //           console.log(`⚠ ${removalTest.name}: insufficient funds`);
  //         }
  //       }
  //     }
  //   });
  // });
});
