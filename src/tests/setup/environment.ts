// environment.ts
import { Connection } from '@solana/web3.js';
import { loadOrCreateWallet, TestWallet } from './wallet';
import { ensureTokenAndPool, TestToken, TestPool } from './token';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';

export interface TestEnvironment {
  connection: Connection;
  wallet: TestWallet;
  token: TestToken;
  pool: TestPool;
  sdk: SarosDLMM;
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  const connection = new Connection(process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const wallet = await loadOrCreateWallet(connection);
  const { token, pool } = await ensureTokenAndPool(connection, wallet.keypair);
  const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });

  return { connection, wallet, token, pool, sdk };
}
