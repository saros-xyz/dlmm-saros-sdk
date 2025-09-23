import * as fs from 'fs';
import * as path from 'path';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { TestWalletSetup, TestTokenInfo } from './wallet-setup';

export async function createTokensIfNeeded(walletSetup: TestWalletSetup): Promise<void> {
  const testDir = path.join(process.cwd(), 'test-data');
  const tokenConfigPath = path.join(testDir, 'test-tokens.json');

  if (fs.existsSync(tokenConfigPath)) {
    return;
  }

  console.log('Creating test tokens...');

  const tempWalletInfo = await walletSetup.setup();
  const connection = walletSetup.getConnection();
  const wallet = tempWalletInfo.keypair;

  const tokens: TestTokenInfo[] = [];

  try {
    // Create SAROSDEV token
    const sarosMint = await createMint(connection, wallet, wallet.publicKey, wallet.publicKey, 9);

    const sarosTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      sarosMint,
      wallet.publicKey
    );

    await mintTo(
      connection,
      wallet,
      sarosMint,
      sarosTokenAccount.address,
      wallet.publicKey,
      1000000 * Math.pow(10, 9)
    );

    tokens.push({
      name: 'Saros Dev',
      symbol: 'SAROSDEV',
      mintAddress: sarosMint.toBase58(),
      decimals: 9,
      supply: 1000000,
    });

    // Create TESTUSDC token
    const usdcMint = await createMint(connection, wallet, wallet.publicKey, wallet.publicKey, 6);

    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      usdcMint,
      wallet.publicKey
    );

    await mintTo(
      connection,
      wallet,
      usdcMint,
      usdcTokenAccount.address,
      wallet.publicKey,
      100000 * Math.pow(10, 6)
    );

    tokens.push({
      name: 'Test USDC',
      symbol: 'TESTUSDC',
      mintAddress: usdcMint.toBase58(),
      decimals: 6,
      supply: 100000,
    });

    // Create TESTWBTC token
    const wbtcMint = await createMint(connection, wallet, wallet.publicKey, wallet.publicKey, 8);

    const wbtcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      wbtcMint,
      wallet.publicKey
    );

    await mintTo(
      connection,
      wallet,
      wbtcMint,
      wbtcTokenAccount.address,
      wallet.publicKey,
      10 * Math.pow(10, 8)
    );

    tokens.push({
      name: 'Test Wrapped Bitcoin',
      symbol: 'TESTWBTC',
      mintAddress: wbtcMint.toBase58(),
      decimals: 8,
      supply: 10,
    });

    const walletInfo = await walletSetup.setup();
    walletInfo.tokens = tokens;
    walletSetup.saveTestData(walletInfo);

    console.log('Test tokens ready: SAROSDEV, TESTUSDC, TESTWBTC');
  } catch (error) {
    console.error('Failed to create test tokens:', error);
    throw error;
  }
}
