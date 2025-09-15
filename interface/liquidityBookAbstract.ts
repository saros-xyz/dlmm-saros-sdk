import { Connection } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { ILiquidityBookConfig, MODE } from "../types";
import { RPC_CONFIG } from "../constants";
import LiquidityBookIDL from "../constants/idl/liquidity_book.json";
import MdmaIDL from "../constants/idl/mdma_hook.json";
import LiquidityBookIDLDevnet from "../constants/idl_devnet/liquidity_book.json";
import MdmaIDLDevnet from "../constants/idl_devnet/mdma_hook.json";

export abstract class LiquidityBookAbstract {
  connection: Connection;
  lbProgram!: Program<Idl>;
  hooksProgram!: Program<Idl>;
  mode!: MODE;

  constructor(config: ILiquidityBookConfig) {
    // Initialize RPC connection
    this.connection = new Connection(
      config.options?.rpcUrl || RPC_CONFIG[config.mode].rpc,
      config.options?.commitmentOrConfig || "confirmed"
    );

    const provider = new AnchorProvider(
      this.connection,
      {} as Wallet,
      AnchorProvider.defaultOptions()
    );
    this.mode = config.mode;

    if (config.mode === MODE.DEVNET) {
      this.lbProgram = new Program(LiquidityBookIDLDevnet as Idl, provider);
      this.hooksProgram = new Program(MdmaIDLDevnet as Idl, provider);
    } else {
      // MODE.MAINNET or MODE.TESTNET
      this.lbProgram = new Program(LiquidityBookIDL as Idl, provider);
      this.hooksProgram = new Program(MdmaIDL as Idl, provider);
    }
  }
}
