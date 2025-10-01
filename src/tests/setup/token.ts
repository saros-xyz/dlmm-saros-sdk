// token.ts
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { SarosDLMM } from '../../services';
import { MODE } from '../../constants';
import { waitForConfirmation } from './test-util';

export interface TestToken {
  name: string;
  symbol: string;
  mint: PublicKey;
  decimals: number;
  supply: number;
}

export interface TestPool {
  pair: PublicKey;
  tokenX: PublicKey;
  tokenY: PublicKey;
  binStep: number;
  ratePrice: number;
}

const CONFIG_FILE = path.join(process.cwd(), 'test-data/test-config.json');
const WRAP_SOL = new PublicKey('So11111111111111111111111111111111111111112');

export async function ensureTokenAndPool(
  connection: Connection,
  payer: Keypair
): Promise<{ token: TestToken; pool: TestPool }> {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return {
      token: { ...saved.token, mint: new PublicKey(saved.token.mint) },
      pool: { ...saved.pool, pair: new PublicKey(saved.pool.pair), tokenX: new PublicKey(saved.pool.tokenX), tokenY: new PublicKey(saved.pool.tokenY) },
    };
  }

  console.log('Creating SAROSDEV token...');
  const sarosMint = await createMint(connection, payer, payer.publicKey, null, 9);
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, sarosMint, payer.publicKey);
  await mintTo(connection, payer, sarosMint, ata.address, payer.publicKey, 1_000_000n * 10n ** 9n);

  const token: TestToken = {
    name: 'Saros Dev',
    symbol: 'SAROSDEV',
    mint: sarosMint,
    decimals: 9,
    supply: 1_000_000,
  };

  console.log('Creating pool...');
  const sdk = new SarosDLMM({ mode: MODE.DEVNET, connection });
  const result = await sdk.createPair({
    tokenX: { mintAddress: sarosMint, decimals: 9 },
    tokenY: { mintAddress: WRAP_SOL, decimals: 9 },
    binStep: 1,
    ratePrice: 0.000002,
    payer: payer.publicKey,
  });

 

await waitForConfirmation(await connection.sendTransaction( result.transaction, [payer]), connection);

  const pool: TestPool = {
    pair: result.pair,
    tokenX: sarosMint,
    tokenY: WRAP_SOL,
    binStep: 1,
    ratePrice: 0.000002,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: { ...token, mint: token.mint.toBase58() }, pool: { ...pool, pair: pool.pair.toBase58(), tokenX: pool.tokenX.toBase58(), tokenY: pool.tokenY.toBase58() } }, null, 2));

  return { token, pool };
}
