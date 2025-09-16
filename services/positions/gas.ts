import { Connection } from '@solana/web3.js';
import { UNIT_PRICE_DEFAULT } from '../../constants';

export const getGasPrice = async (connection: Connection): Promise<number> => {
  const buffNum = 100;
  try {
    return await new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve(UNIT_PRICE_DEFAULT * buffNum);
      }, 2000);
      const getPriority = await connection.getRecentPrioritizationFees();
      const currentFee = getPriority
        .filter((fee) => fee?.prioritizationFee > 0)
        .map((fee) => fee?.prioritizationFee);
      clearTimeout(timeout);
      const unitPrice =
        currentFee.length > 0 ? Math.max(...currentFee, UNIT_PRICE_DEFAULT) : UNIT_PRICE_DEFAULT;
      resolve(unitPrice * buffNum);
    });
  } catch {
    return UNIT_PRICE_DEFAULT * buffNum;
  }
};

export const getComputeUnitPrice = (unitPrice?: number, bufferGas?: number): number => {
  const basePrice = unitPrice || UNIT_PRICE_DEFAULT;
  const buffer = bufferGas || 1.2;
  return Math.ceil(basePrice * buffer);
};
