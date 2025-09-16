import { ComputeBudgetProgram, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { CCU_LIMIT } from '../constants';

/**
 * Add compute budget instructions to a transaction
 * @param transaction - Transaction to modify
 * @param unitPrice - Compute unit price in micro-lamports
 * @param computeLimit - Optional compute unit limit (defaults to CCU_LIMIT)
 */
export const addComputeBudgetInstructions = (
  transaction: Transaction,
  unitPrice: number,
  computeLimit: number = CCU_LIMIT,
): void => {
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: computeLimit,
    }),
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: unitPrice,
    }),
  );
};

/**
 * Add SOL transfer and sync native instructions for wrapped SOL handling
 * @param transaction - Transaction to modify
 * @param payer - Payer public key
 * @param associatedUserVault - User's associated token account
 * @param amount - Amount to transfer in lamports
 */
export const addSolTransferInstructions = (
  transaction: Transaction,
  payer: PublicKey,
  associatedUserVault: PublicKey,
  amount: bigint | number,
): void => {
  const lamports = typeof amount === 'bigint' ? Number(amount) : amount;

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: associatedUserVault,
      lamports,
    }),
  );
  transaction.add(spl.createSyncNativeInstruction(associatedUserVault));
};

/**
 * Add close account instruction for wrapped SOL cleanup
 * @param transaction - Transaction to modify
 * @param associatedUserVault - User's associated token account to close
 * @param payer - Payer public key (receives lamports)
 */
export const addCloseAccountInstruction = (
  transaction: Transaction,
  associatedUserVault: PublicKey,
  payer: PublicKey,
): void => {
  transaction.add(spl.createCloseAccountInstruction(associatedUserVault, payer, payer));
};
