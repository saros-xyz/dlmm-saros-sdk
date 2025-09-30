import * as fs from 'fs';
import * as path from 'path';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { TestWalletSetup, TestTokenInfo, TestPoolInfo } from './wallet-setup';
import { PublicKey } from '@solana/web3.js';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';

export async function createTokensIfNeeded(walletSetup: TestWalletSetup): Promise<void> {
  const testDir = path.join(process.cwd(), 'test-data');
  const tokenConfigPath = path.join(testDir, 'test-tokens.json');

  if (fs.existsSync(tokenConfigPath)) {
    return;
  }

  console.log('Creating SAROSDEV token...');

  const tempWalletInfo = await walletSetup.setup();
  const connection = walletSetup.getConnection();
  const wallet = tempWalletInfo.keypair;

  const tokens: TestTokenInfo[] = [];

  try {
    // Create SAROSDEV token
    const sarosMint = await createMint(connection, wallet, wallet.publicKey, wallet.publicKey, 9);

    const sarosTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, sarosMint, wallet.publicKey);

    await mintTo(connection, wallet, sarosMint, sarosTokenAccount.address, wallet.publicKey, 1000000 * Math.pow(10, 9));

    tokens.push({
      name: 'Saros Dev',
      symbol: 'SAROSDEV',
      mintAddress: sarosMint,
      decimals: 9,
      supply: 1000000,
    });

    console.log(`✅ SAROSDEV token created: ${sarosMint.toString()}`);

    // Create SAROSDEV/wSOL pool
    console.log('Creating SAROSDEV/wSOL pool...');
    const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });

    const WRAP_SOL_PUBKEY = new PublicKey('So11111111111111111111111111111111111111112');

    const poolParams = {
      tokenX: { mintAddress: sarosMint, decimals: 9 },
      tokenY: { mintAddress: WRAP_SOL_PUBKEY, decimals: 9 },
      binStep: 25,
      ratePrice: 0.00001,
      payer: wallet.publicKey,
    };

    const result = await sdk.createPair(poolParams);

    let sig = '';
    try {
      sig = await connection.sendTransaction(result.transaction, [wallet]);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log(`✅ Pool created: ${result.pair.toString()}`);
    } catch (err: any) {
      if (!String(err).includes('already in use')) {
        throw err;
      }
      console.log(`Pool already exists: ${result.pair.toString()}`);
    }

    // Verify pool
    const pair = await sdk.getPair(result.pair);

    const pool: TestPoolInfo = {
      pair: result.pair.toString(),
      tokenX: sarosMint.toString(),
      tokenY: WRAP_SOL_PUBKEY.toString(),
      binStep: 25,
      ratePrice: 0.00001,
      activeBin: result.activeBin,
      binArrayLower: result.binArrayLower.toString(),
      binArrayUpper: result.binArrayUpper.toString(),
      signature: sig,
    };

    // Save tokens and pool
    const walletInfo = await walletSetup.setup();
    walletInfo.tokens = tokens;
    walletInfo.pools = [pool];
    walletSetup.saveTestData(walletInfo);

    console.log(`✅ Test environment ready: 1 token, 1 pool`);
  } catch (error) {
    console.error('Failed to create test environment:', error);
    throw error;
  }
}
