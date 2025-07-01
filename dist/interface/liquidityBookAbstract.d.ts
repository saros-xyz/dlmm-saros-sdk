import { Connection } from "@solana/web3.js";
import { Idl, Program } from "@coral-xyz/anchor";
import { ILiquidityBookConfig } from "../types";
export declare abstract class LiquidityBookAbstract {
    connection: Connection;
    lbProgram: Program<Idl>;
    hooksProgram: Program<Idl>;
    constructor(config: ILiquidityBookConfig);
}
