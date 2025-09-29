import { TestWalletSetup } from './wallet-setup';
import { createTokensIfNeeded } from './token-creator';
import { Connection } from '@solana/web3.js';

let setupPromise: Promise<void> | null = null;

async function setupTestEnvironment() {
  // Only setup once per test run
  if ((global as any).testWallet) {
    return;
  }

  console.log('🔧 Setting up test environment...');

  const connection = new Connection(process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const walletSetup = new TestWalletSetup({}, connection);
  // Check if tokens exist, create them if not
  await createTokensIfNeeded(walletSetup);

  // Setup wallet and load tokens
  const testWallet = await walletSetup.setup();

  // Make wallet available globally
  (global as any).testWallet = testWallet;
  (global as any).testConnection = walletSetup.getConnection();
  (global as any).testWalletSetup = walletSetup;

  console.log(
    `✅ Ready: ${testWallet.address} | ${testWallet.tokens.length} tokens | ${testWallet.balance.toFixed(2)} SOL`
  );
}

export async function ensureTestEnvironment() {
  if (!setupPromise) {
    setupPromise = setupTestEnvironment();
  }
  return setupPromise;
}

// Run the setup immediately when this module is imported
setupPromise = setupTestEnvironment();
