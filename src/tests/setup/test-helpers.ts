import { Connection, Keypair } from '@solana/web3.js';
import { TestWalletInfo, TestTokenInfo, TestWalletSetup, TestPoolInfo } from './wallet-setup';
import { WRAP_SOL_PUBKEY } from '../../constants';

// Native SOL token info
export const NATIVE_SOL: TestTokenInfo = {
  symbol: 'wSOL',
  mintAddress: WRAP_SOL_PUBKEY.toString(),
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

  const baseToken = getTestToken(baseSymbol);
  const quoteToken = getTestToken(quoteSymbol);

  return (
    pools.find(
      (pool) =>
        pool.baseToken === baseToken.mintAddress &&
        pool.quoteToken === quoteToken.mintAddress &&
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