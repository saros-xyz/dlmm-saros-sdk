import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { TestWalletInfo, TestTokenInfo, TestWalletSetup, TestPoolInfo } from './wallet-setup';
import { WRAP_SOL_PUBKEY } from '../../constants';
import { SarosDLMM } from '../../services';
import { MODE, RemoveLiquidityType } from '../../constants';
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

export function getTestToken(symbol?: string): TestTokenInfo {
  if (symbol === 'wSOL' || symbol === 'SOL') {
    return {
      ...NATIVE_SOL,
      mintAddress: new PublicKey(NATIVE_SOL.mintAddress), // ensure PublicKey
    };
  }

  const wallet = getTestWallet();
  if (!wallet.tokens || wallet.tokens.length === 0) {
    throw new Error('No test tokens available.');
  }

  const token = symbol ? wallet.tokens.find((t) => t.symbol === symbol) : wallet.tokens[0];

  if (!token) {
    throw new Error(
      `Test token ${symbol} not found. Available: ${wallet.tokens.map((t) => t.symbol).join(', ')}, wSOL`
    );
  }

  return {
    ...token,
    mintAddress: new PublicKey(token.mintAddress), // force to PublicKey
  };
}

export function getAllTestTokens(): TestTokenInfo[] {
  const wallet = getTestWallet();
  return wallet.tokens || [];
}

export function getTestPool(): TestPoolInfo {
  const wallet = getTestWallet();
  const pools = wallet.pools || [];

  if (pools.length === 0) {
    throw new Error('No test pool available. Make sure global setup ran.');
  }

  return pools[0];
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

export async function getTokenBalance(connection: Connection, owner: PublicKey, mint: PublicKey): Promise<bigint> {
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
  const testPool = getTestPool();
  const lbServices = createTestSarosDLMM();

  return { lbServices, testWallet, connection, testPool };
}
