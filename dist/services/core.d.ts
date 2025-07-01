import { PublicKey, Transaction } from "@solana/web3.js";
import { ILiquidityBookConfig, PoolMetadata } from "../types";
import { LiquidityBookAbstract } from "../interface/liquidityBookAbstract";
import { AddLiquidityIntoPositionParams, CreatePairWithConfigParams, CreatePositionParams, GetBinArrayParams, GetBinsArrayInfoParams, GetBinsReserveParams, GetBinsReserveResponse, GetTokenOutputParams, GetTokenOutputResponse, GetUserVaultInfoParams, RemoveMultipleLiquidityParams, RemoveMultipleLiquidityResponse, SwapParams, UserPositionsParams } from "../types/services";
export declare class LiquidityBookServices extends LiquidityBookAbstract {
    bufferGas?: number;
    constructor(config: ILiquidityBookConfig);
    get lbConfig(): PublicKey;
    get hooksConfig(): PublicKey;
    getPairAccount(pair: PublicKey): Promise<any>;
    getPositionAccount(position: PublicKey): Promise<any>;
    getBinArray(params: GetBinArrayParams): Promise<PublicKey>;
    getBinArrayInfo(params: GetBinsArrayInfoParams): Promise<{
        bins: any[];
        resultIndex: number;
    }>;
    getBinsReserveInformation(params: GetBinsReserveParams): Promise<GetBinsReserveResponse[]>;
    createPairWithConfig(params: CreatePairWithConfigParams): Promise<{
        tx: Transaction;
        pair: string;
        binArrayLower: string;
        binArrayUpper: string;
        hooksConfig: string;
        activeBin: number;
    }>;
    createPosition(params: CreatePositionParams): Promise<{
        position: string;
    }>;
    addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams): Promise<void>;
    removeMultipleLiquidity(params: RemoveMultipleLiquidityParams): Promise<RemoveMultipleLiquidityResponse>;
    swap(params: SwapParams): Promise<Transaction>;
    getQuote(params: GetTokenOutputParams): Promise<GetTokenOutputResponse>;
    getMaxAmountOutWithFee(pairAddress: PublicKey, amount: number, swapForY?: boolean, decimalBase?: number, decimalQuote?: number): Promise<{
        maxAmountOut: number | undefined;
        price: number;
    }>;
    getDexName(): string;
    getDexProgramId(): PublicKey;
    fetchPoolAddresses(): Promise<string[]>;
    getUserPositions({ payer, pair }: UserPositionsParams): Promise<any[]>;
    quote(params: {
        amount: number;
        metadata: PoolMetadata;
        optional: {
            isExactInput: boolean;
            swapForY: boolean;
            slippage: number;
        };
    }): Promise<GetTokenOutputResponse>;
    fetchPoolMetadata(pair: string): Promise<PoolMetadata>;
    getPairVaultInfo(params: {
        tokenAddress: PublicKey;
        pair: PublicKey;
        payer?: PublicKey;
        transaction?: Transaction;
    }): Promise<PublicKey>;
    getUserVaultInfo(params: GetUserVaultInfoParams): Promise<PublicKey>;
    listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>): Promise<void>;
    private getPairAddressFromLogs;
}
