import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';

export interface GetPairVaultInfoParams {
  tokenAddress: PublicKey;
  pair: PublicKey;
  payer?: PublicKey;
  transaction?: Transaction;
}

// GetUserVaultInfoParams is already exported from types
import { GetUserVaultInfoParams } from '../types';

export async function getTokenProgram(
  address: PublicKey,
  connection: Connection,
): Promise<PublicKey> {
  const account = await connection.getParsedAccountInfo(address);
  const owner = account.value?.owner.toBase58();

  return owner === spl.TOKEN_PROGRAM_ID.toBase58()
    ? spl.TOKEN_PROGRAM_ID
    : spl.TOKEN_2022_PROGRAM_ID;
}

export async function getPairVaultInfo(
  params: GetPairVaultInfoParams,
  connection: Connection,
): Promise<PublicKey> {
  const { tokenAddress, pair, payer, transaction } = params;

  const tokenMint = new PublicKey(tokenAddress);
  const tokenProgram = await getTokenProgram(tokenMint, connection);

  const associatedPairVault = spl.getAssociatedTokenAddressSync(
    tokenMint,
    pair,
    true,
    tokenProgram,
  );

  if (transaction && payer) {
    const infoPairVault = await connection.getAccountInfo(associatedPairVault);

    if (!infoPairVault) {
      const pairVaultInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedPairVault,
        pair,
        tokenMint,
        tokenProgram,
      );
      transaction.add(pairVaultInstructions);
    }
  }

  return associatedPairVault;
}

export async function getUserVaultInfo(
  params: GetUserVaultInfoParams,
  connection: Connection,
): Promise<PublicKey> {
  const { tokenAddress, payer, transaction } = params;
  const tokenProgram = await getTokenProgram(tokenAddress, connection);
  const associatedUserVault = spl.getAssociatedTokenAddressSync(
    tokenAddress,
    payer,
    true,
    tokenProgram,
  );

  if (transaction) {
    const infoUserVault = await connection.getAccountInfo(associatedUserVault);

    if (!infoUserVault) {
      const userVaultInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVault,
        payer,
        tokenAddress,
        tokenProgram,
      );
      transaction.add(userVaultInstructions);
    }
  }
  return associatedUserVault;
}
