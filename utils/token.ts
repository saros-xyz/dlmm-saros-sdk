import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { WRAP_SOL_ADDRESS } from '../constants';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const getProgram = async (address: PublicKey, connection: Connection) => {
  const account = await connection.getParsedAccountInfo(address);

  const owner = account.value?.owner.toBase58();

  const program = owner === TOKEN_PROGRAM_ID.toBase58() ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

  return program;
};


/**
 * Determine token program from account info
 */
export function getTokenProgramFromAccountInfo(address: PublicKey, accountInfo: any): PublicKey {
  if (address.toString() === WRAP_SOL_ADDRESS) {
    return spl.TOKEN_PROGRAM_ID; // WSOL is always legacy
  }
  if (!accountInfo) throw new Error(`Missing account info for ${address.toBase58()}`);
  const owner = accountInfo.owner.toBase58();
  return owner === spl.TOKEN_PROGRAM_ID.toBase58() ? spl.TOKEN_PROGRAM_ID : spl.TOKEN_2022_PROGRAM_ID;
}

/**
 * Ensure a user's ATA exists; if missing, add create ix to tx
 */
export async function ensureUserVault(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey,
  tx: Transaction
): Promise<PublicKey> {
  const ata = spl.getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);
  const info = await connection.getAccountInfo(ata);
  if (!info) {
    tx.add(spl.createAssociatedTokenAccountInstruction(owner, ata, owner, mint, tokenProgram));
  }
  return ata;
}

/**
 * Fund + Sync a WSOL ATA for a transfer amount (lamports).
 */
export function fundAndSyncWSOL(tx: Transaction, payer: PublicKey, ata: PublicKey, lamports: number) {
  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: ata, lamports }));
  tx.add(spl.createSyncNativeInstruction(ata));
}

/**
 * Close WSOL ATA to reclaim lamports
 */
export function closeWSOLIfNeeded(tx: Transaction, mint: PublicKey, ata: PublicKey, owner: PublicKey) {
  if (mint.toString() === WRAP_SOL_ADDRESS) {
    tx.add(spl.createCloseAccountInstruction(ata, owner, owner));
  }
}


