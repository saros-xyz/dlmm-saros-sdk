import { Connection } from "@solana/web3.js";
import { LiquidityShape, PositionInfo } from "../types/services";
export interface Distribution {
    relativeBinId: number;
    distributionX: number;
    distributionY: number;
}
interface CreateLiquidityDistributionParams {
    shape: LiquidityShape;
    binRange: [number, number];
}
export declare function createUniformDistribution(params: CreateLiquidityDistributionParams): Distribution[];
export declare const getMaxPosition: (range: [number, number], activeId: number) => number[];
export declare const getMaxBinArray: (range: [number, number], activeId: number) => {
    binArrayLowerIndex: number;
    binArrayUpperIndex: number;
}[];
export declare const getBinRange: (index: number, activeId: number) => {
    range: number[];
    binLower: number;
    binUpper: number;
};
export declare const findPosition: (index: number, activeBin?: number) => (position: PositionInfo) => boolean;
export declare const getGasPrice: (connection: Connection) => Promise<number>;
export {};
