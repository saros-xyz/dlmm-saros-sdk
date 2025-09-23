import {
  ComputeBudgetProgram,
  SystemProgram,
  Transaction,
  PublicKey,
  Connection,
} from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { CCU_LIMIT, UNIT_PRICE_DEFAULT } from '../constants';

/**
 * Get optimal gas price from recent prioritization fees
 */
const getOptimalGasPrice = async (
  connection: Connection,
  bufferMultiplier: number = 1.5
): Promise<number> => {
  try {
    const fees = await Promise.race([
      connection.getRecentPrioritizationFees(),
      new Promise<never>((_, reject) => setTimeout(() => reject(), 2000)),
    ]);

    const activeFees = fees
      .filter((fee) => fee?.prioritizationFee > 0)
      .map((fee) => fee.prioritizationFee);

    const basePrice =
      activeFees.length > 0 ? Math.max(...activeFees, UNIT_PRICE_DEFAULT) : UNIT_PRICE_DEFAULT;

    return Math.ceil(basePrice * bufferMultiplier);
  } catch {
    return Math.ceil(UNIT_PRICE_DEFAULT * bufferMultiplier);
  }
};

export const addComputeBudgetInstructions = (
  transaction: Transaction,
  unitPrice: number,
  computeLimit: number = CCU_LIMIT
): void => {
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: unitPrice })
  );
};

export const addOptimalComputeBudget = async (
  transaction: Transaction,
  connection: Connection,
  bufferMultiplier?: number
): Promise<void> => {
  const unitPrice = await getOptimalGasPrice(connection, bufferMultiplier);
  addComputeBudgetInstructions(transaction, unitPrice);
};

/**
 * Wrap SOL -> WSOL by transferring lamports then calling SyncNative on the correct token program
 * - tokenProgram MUST be the program owning the target token account (legacy or token-2022)
 */
export const addSolTransferInstructions = (
  transaction: Transaction,
  payer: PublicKey,
  vault: PublicKey,
  amount: bigint | number,
  tokenProgram: PublicKey
): void => {
  const lamports = typeof amount === 'bigint' ? Number(amount) : amount;
  transaction.add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: vault, lamports }),
    // Pass the token program that owns the token account (legacy or 2022)
    spl.createSyncNativeInstruction(vault, tokenProgram)
  );
};

/**
 * Close token account instruction: Use the token program that owns the account.
 */
export const addCloseAccountInstruction = (
  transaction: Transaction,
  vault: PublicKey,
  payer: PublicKey,
  tokenProgram: PublicKey
): void => {
  transaction.add(
    spl.createCloseAccountInstruction(vault, payer, payer, [], tokenProgram)
  );
};
