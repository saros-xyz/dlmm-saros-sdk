import {
  ComputeBudgetProgram,
  SystemProgram,
  Transaction,
  PublicKey,
  Connection,
  TransactionMessage,
} from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { Buffer } from 'buffer';
import { CCU_LIMIT, UNIT_PRICE_DEFAULT, WRAP_SOL_PUBKEY } from '../constants';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { SarosDLMMError } from './errors';

/** Get optimal gas price from recent prioritization fees */
const getOptimalGasPrice = async (connection: Connection, bufferMultiplier: number = 1.5): Promise<number> => {
  try {
    const fees = await Promise.race([
      connection.getRecentPrioritizationFees(),
      new Promise<never>((_, reject) => setTimeout(() => reject(), 2000)),
    ]);

    const activeFees = fees.filter((fee) => fee?.prioritizationFee > 0).map((fee) => fee.prioritizationFee);

    const basePrice = activeFees.length > 0 ? Math.max(...activeFees, UNIT_PRICE_DEFAULT) : UNIT_PRICE_DEFAULT;

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
  amount: bigint
): void => {
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: vault,
      lamports: amount,
    }),
    spl.createSyncNativeInstruction(vault)
  );
};

export const addCloseAccountInstruction = (transaction: Transaction, vault: PublicKey, payer: PublicKey): void => {
  transaction.add(spl.createCloseAccountInstruction(vault, payer, payer));
};

/** Extracts the pair address from an initialize_pair transaction by parsing the instruction accounts */
export async function extractPairFromTx(connection: Connection, signature: string): Promise<PublicKey | null> {
  const parsedTransaction = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!parsedTransaction) throw SarosDLMMError.TransactionNotFound();

  const compiledMessage = parsedTransaction.transaction.message;
  const message = TransactionMessage.decompile(compiledMessage);
  const instructions = message.instructions;
  const initializePairStruct = LiquidityBookIDL.instructions.find((item) => item.name === 'initialize_pair')!;

  const initializePairDescrimator = Buffer.from(initializePairStruct.discriminator);

  for (const instruction of instructions) {
    const descimatorInstruction = instruction.data.subarray(0, 8);
    if (!descimatorInstruction.equals(initializePairDescrimator)) continue;

    const accounts = initializePairStruct.accounts.map((item, index) => ({
      name: item.name,
      address: instruction.keys[index].pubkey,
    }));

    const pairAccount = accounts.find((item) => item.name === 'pair');
    return pairAccount ? pairAccount.address : null;
  }
  return null;
}

export interface SolWrappingOptions {
  swapForY?: boolean;
  amount?: bigint;
  isPreSwap?: boolean;
}

/** Handle SOL wrapping/unwrapping for swap and liquidity operations */
export const handleSolWrapping = (
  transaction: Transaction,
  tokenMintX: PublicKey,
  tokenMintY: PublicKey,
  associatedUserVaultX: PublicKey,
  associatedUserVaultY: PublicKey,
  payer: PublicKey,
  options: SolWrappingOptions
): void => {
  if (!tokenMintY.equals(WRAP_SOL_PUBKEY) && !tokenMintX.equals(WRAP_SOL_PUBKEY)) {
    return;
  }

  const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
  const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

  if (options.isPreSwap && options.amount && options.swapForY !== undefined) {
    // Pre-swap: Wrap SOL if we're swapping FROM the native token
    if ((isNativeY && !options.swapForY) || (!isNativeY && options.swapForY)) {
      addSolTransferInstructions(transaction, payer, associatedUserVault, options.amount);
    }
  } else if (!options.isPreSwap && options.swapForY !== undefined) {
    // Post-swap: Unwrap SOL if we swapped TO the native token
    if ((isNativeY && options.swapForY) || (!isNativeY && !options.swapForY)) {
      addCloseAccountInstruction(transaction, associatedUserVault, payer);
    }
  } else if (!options.isPreSwap && options.swapForY === undefined) {
    // Cleanup transaction: Always unwrap any remaining wrapped SOL
    addCloseAccountInstruction(transaction, associatedUserVault, payer);
  }
};
