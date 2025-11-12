import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';

export async function ensureHookTokenAccount(
  hook: PublicKey,
  tokenMint: PublicKey,
  tokenProgram: PublicKey,
  payer: PublicKey,
  connection: Connection,
  transaction: Transaction
): Promise<PublicKey> {
  const associatedHookToken = spl.getAssociatedTokenAddressSync(tokenMint, hook, true, tokenProgram);

  const info = await connection.getAccountInfo(associatedHookToken);
  if (!info) {
    transaction.add(
      spl.createAssociatedTokenAccountInstruction(payer, associatedHookToken, hook, tokenMint, tokenProgram)
    );
  }

  return associatedHookToken;
}
