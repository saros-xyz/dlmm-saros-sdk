import { Connection } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { ILiquidityBookConfig } from "../types";
import { CONFIG } from "../constants/config";
import LiquidityBookIDL from "../constants/idl/liquidity_book.json";
import MdmaIDL from "../constants/idl/mdma_hook.json";

export abstract class LiquidityBookAbstract {
  connection: Connection;

  lbProgram!: Program<Idl>;
  hooksProgram!: Program<Idl>;

  constructor(config: ILiquidityBookConfig) {
    // Initialize the services heref
    this.connection = new Connection(
      config.options?.rpcUrl || CONFIG[config.mode].rpc,
      config.options?.commitmentOrConfig || "confirmed"
    );

    const provider = new AnchorProvider(
      this.connection,
      {} as Wallet,
      AnchorProvider.defaultOptions()
    );

    this.lbProgram = new Program(LiquidityBookIDL as Idl, provider);
    this.hooksProgram = new Program(MdmaIDL as Idl, provider);
  }
}
