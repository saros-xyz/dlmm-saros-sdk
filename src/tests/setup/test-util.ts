// test-utils.ts
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { SarosDLMMPair } from '../../services/pair';
import { RemoveLiquidityType, WRAP_SOL_PUBKEY } from '../../constants';
import { TestWallet } from './wallet';

export async function waitForConfirmation(sig: string, connection: Connection) {
  console.log(`Waiting for confirmation: ${sig}`);
  const res = await connection.confirmTransaction(sig, 'confirmed');
  if (res.value.err) throw new Error(`Transaction failed: ${res.value.err}`);
  console.log(`Transaction confirmed: ${sig}`);
  return res;
}

export async function cleanupLiquidity(
  pairInstance: SarosDLMMPair,
  positionKeypair: Keypair,
  testWallet: TestWallet,
  connection: Connection
): Promise<void> {
  const result = await pairInstance.removeLiquidity({
    positionMints: [positionKeypair.publicKey],
    payer: testWallet.keypair.publicKey,
    type: RemoveLiquidityType.All,
  });

  if (result.setupTransaction) {
    const setupSig = await connection.sendTransaction(result.setupTransaction, [testWallet.keypair]);
    await connection.confirmTransaction(setupSig, 'confirmed');
  }
  for (const tx of result.transactions) {
    const sig = await connection.sendTransaction(tx, [testWallet.keypair]);
    await connection.confirmTransaction(sig, 'confirmed');
  }
  if (result.cleanupTransaction) {
    const cleanupSig = await connection.sendTransaction(result.cleanupTransaction, [testWallet.keypair]);
    await connection.confirmTransaction(cleanupSig, 'confirmed');
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

