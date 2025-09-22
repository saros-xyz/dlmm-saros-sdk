import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TestWalletInfo, TestTokenInfo, TestWalletSetup, TestPoolInfo } from './wallet-setup';

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

export function getTestWalletSetup(): TestWalletSetup {
  const setup = (global as any).testWalletSetup;
  if (!setup) {
    throw new Error('Test wallet setup not initialized. Make sure global setup ran.');
  }
  return setup;
}

export function getTestToken(symbol?: string): TestTokenInfo {
  const wallet = getTestWallet();
  if (!wallet.tokens || wallet.tokens.length === 0) {
    throw new Error('No test tokens available.');
  }
  
  if (symbol) {
    const token = wallet.tokens.find(t => t.symbol === symbol);
    if (!token) {
      throw new Error(`Test token ${symbol} not found. Available: ${wallet.tokens.map(t => t.symbol).join(', ')}`);
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

export function findTestPool(baseSymbol: string, quoteSymbol: string, binStep: number): TestPoolInfo | null {
  const wallet = getTestWallet();
  const pools = wallet.pools || [];
  
  const baseToken = getTestToken(baseSymbol);
  const quoteToken = getTestToken(quoteSymbol);
  
  return pools.find(pool => 
    pool.baseToken === baseToken.mintAddress &&
    pool.quoteToken === quoteToken.mintAddress &&
    pool.binStep === binStep
  ) || null;
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

export async function fundTestWallet(publicKey: PublicKey, amount: number = 1.0): Promise<void> {
  const setup = getTestWalletSetup();
  await setup.fundWallet(publicKey, amount);
}

export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number> {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return 0;
  }
}

export async function getSolBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / 1_000_000_000;
}