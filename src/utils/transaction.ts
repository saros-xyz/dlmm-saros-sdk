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

export const addSolTransferInstructions = (
  transaction: Transaction,
  payer: PublicKey,
  vault: PublicKey,
  amount: bigint | number
): void => {
  const lamports = typeof amount === 'bigint' ? Number(amount) : amount;
  transaction.add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: vault, lamports }),
    spl.createSyncNativeInstruction(vault)
  );
};

export const addCloseAccountInstruction = (
  transaction: Transaction,
  vault: PublicKey,
  payer: PublicKey
): void => {
  transaction.add(spl.createCloseAccountInstruction(vault, payer, payer));
};
