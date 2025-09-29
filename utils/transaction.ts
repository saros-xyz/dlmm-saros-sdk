import { ComputeBudgetProgram, Connection, Transaction } from '@solana/web3.js';
import { UNIT_PRICE_DEFAULT } from '../constants';

/**
 * Add compute unit budget instructions to a transaction
 */
export function addComputeBudget(tx: Transaction, units: number, microLamports: number) {
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
}

/**
 * Get suggested CU price with buffer fallback
 */
export async function getSuggestedCUPrice(connection: any, bufferGas?: number): Promise<number> {
  const unitSPrice = await getGasPrice(connection).catch(() => undefined);
  return Math.max(Number(unitSPrice) ?? 0, UNIT_PRICE_DEFAULT * (bufferGas ?? 1));
}


export const getGasPrice = async (connection: Connection): Promise<number> => {
  const buffNum = 100;
  try {
    return await new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve(UNIT_PRICE_DEFAULT * buffNum);
      }, 2000);
      const getPriority = await connection.getRecentPrioritizationFees();
      const currentFee = getPriority.filter((fee) => fee?.prioritizationFee > 0).map((fee) => fee?.prioritizationFee);
      clearTimeout(timeout);
      const unitPrice = currentFee.length > 0 ? Math.max(...currentFee, UNIT_PRICE_DEFAULT) : UNIT_PRICE_DEFAULT;
      resolve(unitPrice * buffNum);
    });
  } catch {
    return UNIT_PRICE_DEFAULT * buffNum;
  }
};