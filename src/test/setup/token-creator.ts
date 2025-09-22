import * as fs from "fs";
import * as path from "path";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { TestWalletSetup, TestTokenInfo } from './wallet-setup';

export async function createTokensIfNeeded(walletSetup: TestWalletSetup): Promise<void> {
  const testDir = path.join(process.cwd(), "test-data");
  const tokenConfigPath = path.join(testDir, "test-tokens.json");
  
  // Check if tokens already exist
  if (fs.existsSync(tokenConfigPath)) {
    return;
  }

  console.log('🪙 Creating test tokens...');

  // Get a temporary wallet setup to create tokens
  const tempWalletInfo = await walletSetup.setup();
  const connection = walletSetup.getConnection();
  const wallet = tempWalletInfo.keypair;

  const tokens: TestTokenInfo[] = [];

  try {
    // Create SAROSDEV token
    const sarosMint = await createMint(
      connection,
      wallet, // payer
      wallet.publicKey,
      wallet.publicKey,
      9 // decimals
    );

    const sarosTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      sarosMint,
      wallet.publicKey
    );

    // Mint 1 million tokens
    await mintTo(
      connection,
      wallet,
      sarosMint,
      sarosTokenAccount.address,
      wallet.publicKey,
      1000000 * Math.pow(10, 9)
    );

    tokens.push({
      name: "Saros Dev",
      symbol: "SAROSDEV",
      mintAddress: sarosMint.toBase58(),
      decimals: 9,
      supply: 1000000,
    });

    // Create TESTUSDC token
    const usdcMint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      6 // USDC has 6 decimals
    );

    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      usdcMint,
      wallet.publicKey
    );

    // Mint 100,000 USDC (in 6 decimal format)
    await mintTo(
      connection,
      wallet,
      usdcMint,
      usdcTokenAccount.address,
      wallet.publicKey,
      100000 * Math.pow(10, 6)
    );

    tokens.push({
      name: "Test USDC",
      symbol: "TESTUSDC",
      mintAddress: usdcMint.toBase58(),
      decimals: 6,
      supply: 100000,
    });

    // Create TESTWBTC token
    const wbtcMint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      8 // WBTC has 8 decimals
    );

    const wbtcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      wbtcMint,
      wallet.publicKey
    );

    // Mint 10 WBTC (in 8 decimal format)
    await mintTo(
      connection,
      wallet,
      wbtcMint,
      wbtcTokenAccount.address,
      wallet.publicKey,
      10 * Math.pow(10, 8)
    );

    tokens.push({
      name: "Test Wrapped Bitcoin",
      symbol: "TESTWBTC",
      mintAddress: wbtcMint.toBase58(),
      decimals: 8,
      supply: 10,
    });

    // Save token configs
    walletSetup.saveTokenConfigs(tokens);

    console.log('✅ Test tokens ready: SAROSDEV, TESTUSDC, TESTWBTC');

  } catch (error) {
    console.error('❌ Failed to create test tokens:', error);
    throw error;
  }
}