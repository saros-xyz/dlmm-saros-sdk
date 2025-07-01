import { BN, Idl, Program } from "@coral-xyz/anchor";
import { Bin, BinArray } from "../types";
import { Connection, PublicKey } from "@solana/web3.js";
import { GetBinArrayParams, GetTokenOutputParams, Pair } from "../types/services";
declare class BinArrayRange {
    private readonly bins;
    constructor(binArrayPrevious: BinArray, binArrayCurrent: BinArray, binArrayNext: BinArray);
    getBinMut(binId: number): Bin;
    getAllBins(): Bin[];
}
export declare class LBSwapService {
    lbProgram: Program<Idl>;
    volatilityAccumulator: number;
    volatilityReference: number;
    timeLastUpdated: number;
    referenceId: number;
    connection: Connection;
    constructor(lbProgram: Program<Idl>, connection: Connection);
    static fromLbConfig(lbProgram: Program<Idl>, connection: Connection): LBSwapService;
    getBinArray(params: GetBinArrayParams): PublicKey;
    calculateInOutAmount(params: GetTokenOutputParams): Promise<{
        amountIn: bigint;
        amountOut: bigint;
    }>;
    /**
     * @description Calculate the input amount for the swap. isExactInput = false
     */
    calculateAmountIn(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean): Promise<bigint>;
    /**
     * @description Calculate the output amount for the swap. isExactInput = true
     */
    calculateAmountOut(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean): Promise<bigint>;
    swapExactOutput(params: {
        binStep: number;
        activeId: number;
        amountOutLeft: bigint;
        fee: bigint;
        protocolShare: number;
        swapForY: boolean;
        reserveX: BN;
        reserveY: BN;
    }): {
        amountInWithFees: bigint;
        amountOut: bigint;
        feeAmount: bigint;
        protocolFeeAmount: bigint;
    };
    swapExactInput(params: {
        binStep: number;
        activeId: number;
        amountInLeft: bigint;
        fee: bigint;
        protocolShare: number;
        swapForY: boolean;
        reserveX: BN;
        reserveY: BN;
    }): {
        amountInWithFees: bigint;
        amountOut: bigint;
        feeAmount: bigint;
        protocolFeeAmount: bigint;
    };
    updateReferences(pairInfo: Pair, activeId: number): Promise<void>;
    updateVolatilityReference(pairInfo: Pair): void;
    updateVolatilityAccumulator(pairInfo: Pair, activeId: number): void;
    getVariableFee(pairInfo: Pair): bigint;
    getBaseFee(binStep: number, baseFactor: number): bigint;
    getFeeForAmount(amount: bigint, fee: bigint): bigint;
    getFeeAmount(amount: bigint, fee: bigint): bigint;
    getProtocolFee(fee: bigint, protocolShare: bigint): bigint;
    getTotalFee(pairInfo: Pair): bigint;
    moveActiveId(pairId: number, swapForY: boolean): number;
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
    private calcAmountInByPrice;
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
    private calcAmountOutByPrice;
}
export {};
