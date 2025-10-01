// wallet.ts
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TestWallet {
  keypair: Keypair;
  address: string;
  balance: number;
}

const WALLET_FILE = path.join(process.cwd(), 'test-data/test-wallet.json');

export async function loadOrCreateWallet(connection: Connection): Promise<TestWallet> {
  let keypair: Keypair;

  if (fs.existsSync(WALLET_FILE)) {
    const secret = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    keypair = Keypair.fromSecretKey(new Uint8Array(secret));
  } else {
    keypair = Keypair.generate();
    fs.writeFileSync(WALLET_FILE, JSON.stringify(Array.from(keypair.secretKey)));
    console.log(`Created new test wallet: ${keypair.publicKey.toBase58()}`);
  }

  // Ensure funded
  const balanceLamports = await connection.getBalance(keypair.publicKey);
  if (balanceLamports < 0.5 * LAMPORTS_PER_SOL) {
    console.log(`Airdropping SOL to ${keypair.publicKey.toBase58()}`);
    const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
  }

  const balance = (await connection.getBalance(keypair.publicKey)) / LAMPORTS_PER_SOL;

  return {
    keypair,
    address: keypair.publicKey.toBase58(),
    balance,
  };
}

export function generateTestKeypair(): Keypair {
  return Keypair.generate();
}
