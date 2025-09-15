import { Connection } from "@solana/web3.js";
import {
  ACTIVE_ID,
  MAX_BASIS_POINTS,
  MAX_BASIS_POINTS_BIGINT,
  PRECISION_BIGINT,
  SCALE_OFFSET,
  UNIT_PRICE_DEFAULT,
} from "../constants";

export const getPriceFromId = (
  bin_step: number,
  bin_id: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  // Use same base calculation as getIdFromPrice for consistency
  const base = 1 + bin_step / MAX_BASIS_POINTS;
  const exponent = bin_id - ACTIVE_ID;
  const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal);

  return Math.pow(base, exponent) * decimalPow;
};

export const getIdFromPrice = (
  price: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (price <= 0) throw new Error("Price must be greater than 0");
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS)
    throw new Error("Bin step invalid. (0 < binStep <= 10000)");

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal);

  const base = 1 + binStep / MAX_BASIS_POINTS;
  const exponent = Math.log(price * decimalPow) / Math.log(base);
  const binId = Math.round(exponent + ACTIVE_ID);

  return binId;
};

export const getPriceImpact = (
  amountOut: bigint,
  maxAmountOut: bigint
): number => {
  if (maxAmountOut === 0n) return 0;

  // Using scaled integer math for precision with basis points
  const impactBasisPoints =
    ((amountOut - maxAmountOut) * MAX_BASIS_POINTS_BIGINT * 100n) /
    maxAmountOut;

  return Number(impactBasisPoints) / Number(MAX_BASIS_POINTS_BIGINT); // Convert back to percentage
};

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
        currentFee.length > 0
          ? Math.max(...currentFee, UNIT_PRICE_DEFAULT)
          : UNIT_PRICE_DEFAULT;
      resolve(unitPrice * buffNum);
    });
  } catch {
    return UNIT_PRICE_DEFAULT * buffNum;
  }
};


  /**
   * Calculates the input amount required for a swap based on the desired output amount and price.
   *
   * @param amountOut - The desired output amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling factor used for price adjustments.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - Specifies the rounding mode
   * @returns The calculated input amount as a bigint.
   */
  export const getAmountInByPrice = (
    amountOut: bigint,
    priceScaled: bigint,
    swapForY: boolean,
    rounding: "up" | "down"
  ): bigint  => {
    if (swapForY) {
      // amountIn = (amountOut << scaleOffset) / priceScaled
      return rounding === "up"
        ? ((amountOut << BigInt(SCALE_OFFSET)) + priceScaled - BigInt(1)) /
            priceScaled
        : (amountOut << BigInt(SCALE_OFFSET)) / priceScaled;
    } else {
      // amountIn = (amountOut * priceScaled) >> scaleOffset
      return rounding === "up"
        ? (amountOut * priceScaled +
            (BigInt(1) << BigInt(SCALE_OFFSET)) -
            BigInt(1)) >>
            BigInt(SCALE_OFFSET)
        : (amountOut * priceScaled) >> BigInt(SCALE_OFFSET);
    }
  }

  /**
   * Calculates the output amount based on the input amount, price, and scaling factors.
   *
   * @param amountIn - The input amount as a bigint.
   * @param priceScaled - The scaled price as a bigint.
   * @param scaleOffset - The scaling offset as a number, used to adjust the precision.
   * @param swapForY - A boolean indicating the direction of the swap
   * @param rounding - The rounding mode to apply when calculating the output amount
   * @returns The calculated output amount as a bigint.
   */
  export const getAmountOutByPrice = (
    amountIn: bigint,
    priceScaled: bigint,
    swapForY: boolean,
    rounding: "up" | "down"
  ): bigint => {
    if (swapForY) {
      // price = (Y / X) & swapForY => amountOut = amountIn * price
      // amountOut = (amountIn * priceScaled) >> scaleOffset
      return rounding === "up"
        ? (amountIn * priceScaled +
            (BigInt(1) << BigInt(SCALE_OFFSET)) -
            BigInt(1)) >>
            BigInt(SCALE_OFFSET)
        : (amountIn * priceScaled) >> BigInt(SCALE_OFFSET);
    } else {
      // price = (X / Y) & !swapForY => amountOut = amountIn / price
      // amountOut = (amountIn << scaleOffset) / priceScaled
      return rounding === "up"
        ? ((amountIn << BigInt(SCALE_OFFSET)) + priceScaled - BigInt(1)) /
            priceScaled
        : (amountIn << BigInt(SCALE_OFFSET)) / priceScaled;
    }
  }

  /**
   * Calculate minimum output amount with slippage protection for exact input swaps
   * @param amountOut - Expected output amount
   * @param slippage - Slippage percentage (e.g., 10 for 10%)
   * @returns Minimum acceptable output amount
   */
  export const getMinOutputWithSlippage = (
    amountOut: bigint,
    slippage: number
  ): bigint => {
    const slippageFraction = slippage / 100;
    const slippageScaled = Math.round(
      slippageFraction * Number(PRECISION_BIGINT)
    );
  
    return (
      (amountOut * (PRECISION_BIGINT - BigInt(slippageScaled))) / PRECISION_BIGINT
    );
  };
  
  /**
   * Calculate maximum input amount with slippage protection for exact output swaps
   * @param amountIn - Expected input amount
   * @param slippage - Slippage percentage (e.g., 10 for 10%)
   * @returns Maximum acceptable input amount
   */
  export const getMaxInputWithSlippage = (
    amountIn: bigint,
    slippage: number
  ): bigint => {
    const slippageFraction = slippage / 100;
    const slippageScaled = Math.round(
      slippageFraction * Number(PRECISION_BIGINT)
    );
    const denominatorScaled = Number(PRECISION_BIGINT) - slippageScaled;
  
    if (denominatorScaled <= 0) {
      throw new Error(
        `Invalid slippage: ${slippage}% results in division by zero`
      );
    }
  
    return (amountIn * PRECISION_BIGINT) / BigInt(denominatorScaled);
  };
  