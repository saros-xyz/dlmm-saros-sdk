import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { TestWalletInfo, TestTokenInfo, TestWalletSetup, TestPoolInfo } from './wallet-setup';
import { WRAP_SOL_PUBKEY } from '../../constants';
import { SarosDLMM } from '../../services';
import { MODE, RemoveLiquidityType } from '../../types';
import { SarosDLMMPair } from '../../services/pair';

// Native SOL token info
export const NATIVE_SOL: TestTokenInfo = {
  symbol: 'wSOL',
  mintAddress: WRAP_SOL_PUBKEY,
  decimals: 9,
  name: 'Wrapped SOL',
  supply: 100000000,
};

export function getTestWallet(): TestWalletInfo {
  const wallet = (global as any).testWallet;
  if (!wallet) {
    throw new Error('Test wallet not initialized. Make sure global setup ran.');
  }
  return wallet;
}

export function getTestConnection(): Connection {
  const connection = (global as any).testConnection;
  if (!connection) {
    throw new Error('Test connection not initialized. Make sure global setup ran.');
  }
  return connection;
}

function getTestWalletSetup(): TestWalletSetup {
  const setup = (global as any).testWalletSetup;
  if (!setup) {
    throw new Error('Test wallet setup not initialized. Make sure global setup ran.');
  }
  return setup;
}

export function getTestToken(symbol?: string): TestTokenInfo {
  // Handle native SOL/wSOL
  if (symbol === 'wSOL' || symbol === 'SOL') {
    return NATIVE_SOL;
  }

  const wallet = getTestWallet();
  if (!wallet.tokens || wallet.tokens.length === 0) {
    throw new Error('No test tokens available.');
  }

  if (symbol) {
    const token = wallet.tokens.find((t) => t.symbol === symbol);
    if (!token) {
      throw new Error(
        `Test token ${symbol} not found. Available: ${wallet.tokens.map((t) => t.symbol).join(', ')}, wSOL`
      );
    }
    return token;
  }

  return wallet.tokens[0];
}

export function getAllTestTokens(): TestTokenInfo[] {
  const wallet = getTestWallet();
  return wallet.tokens || [];
}

export function getAllTestPools(): TestPoolInfo[] {
  const wallet = getTestWallet();
  return wallet.pools || [];
}

export function findTestPool(
  baseSymbol: string,
  quoteSymbol: string,
  binStep: number
): TestPoolInfo | null {
  const wallet = getTestWallet();
  const pools = wallet.pools || [];

  const tokenX = getTestToken(baseSymbol);
  const tokenY = getTestToken(quoteSymbol);

  return (
    pools.find(
      (pool) =>
        pool.tokenX === tokenX.mintAddress.toString() &&
        pool.tokenY === tokenY.mintAddress.toString() &&
        pool.binStep === binStep
    ) || null
  );
}

export function saveTestPool(poolInfo: TestPoolInfo): void {
  const wallet = getTestWallet();
  const setup = getTestWalletSetup();

  if (!wallet.pools) {
    wallet.pools = [];
  }

  wallet.pools.push(poolInfo);
  setup.saveTestData(wallet);
}

export async function waitForConfirmation(signature: string, connection: Connection) {
  console.log(`Waiting for confirmation: ${signature}`);

  const result = await connection.confirmTransaction(signature, 'confirmed');

  if (result.value.err) {
    throw new Error(`Transaction failed: ${result.value.err}`);
  }

  console.log(`Transaction confirmed: ${signature}`);
  return result;
}

export function createTestKeypair(): Keypair {
  return TestWalletSetup.generateTestKeypair();
}

// Shared integration test utilities
export function createTestSarosDLMM(): SarosDLMM {
  const connection = getTestConnection();
  return new SarosDLMM({
    mode: MODE.DEVNET,
    connection,
  });
}

export async function cleanupLiquidity(
  pairInstance: SarosDLMMPair,
  positionKeypair: Keypair,
  testWallet: TestWalletInfo,
  connection: Connection
): Promise<void> {
  try {
    const result = await pairInstance.removeLiquidity({
      positionMints: [positionKeypair.publicKey],
      payer: testWallet.keypair.publicKey,
      type: RemoveLiquidityType.All,
    });

    if (result.setupTransaction) {
      await connection.sendTransaction(result.setupTransaction, [testWallet.keypair]);
    }
    for (const tx of result.transactions) {
      await connection.sendTransaction(tx, [testWallet.keypair]);
    }
    if (result.cleanupTransaction) {
      await connection.sendTransaction(result.cleanupTransaction, [testWallet.keypair]);
    }
  } catch {
    // ignore cleanup failures
  }
}

export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<bigint> {
  if (mint.equals(WRAP_SOL_PUBKEY)) {
    // WSOL unwraps into SOL, so check lamports directly
    const acctInfo = await connection.getAccountInfo(owner);
    return acctInfo ? BigInt(acctInfo.lamports) : 0n;
  }
  const ata = spl.getAssociatedTokenAddressSync(mint, owner);
  try {
    const bal = await connection.getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    return 0n;
  }
}

export interface IntegrationTestSetup {
  lbServices: SarosDLMM;
  testWallet: TestWalletInfo;
  connection: Connection;
  testPool: TestPoolInfo;
}

export function setupIntegrationTest(): IntegrationTestSetup {
  const testWallet = getTestWallet();
  const connection = getTestConnection();

  const tokens = getAllTestTokens();
  const saros = tokens.find((t) => t.symbol === 'SAROSDEV');
  if (!saros) throw new Error('SAROSDEV token missing');

  const pools = getAllTestPools();
  const testPool = pools.find(
    (p) => p.tokenX === saros.mintAddress.toString() || p.tokenY === saros.mintAddress.toString()
  );
  if (!testPool) throw new Error('No pool with SAROSDEV token');

  const lbServices = createTestSarosDLMM();

  return { lbServices, testWallet, connection, testPool };
}
