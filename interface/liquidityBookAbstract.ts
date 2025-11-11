import { Connection } from "@solana/web3.js";
import { CONFIG } from "../constants/config";
import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import {
  type ILiquidityBookConfig,
  MODE,
  type LiquidityBook,
  type RewarderHook,
} from "../types";

import MdmaIDL from "../constants/idl/rewarder_hook.json";
import LiquidityBookIDL from "../constants/idl/liquidity_book.json";
import MdmaIDLDevnet from "../constants/idl_devnet/rewarder_hook.json";
import LiquidityBookIDLDevnet from "../constants/idl_devnet/liquidity_book.json";

export abstract class LiquidityBookAbstract {
  readonly connection: Connection;

  readonly mode: MODE;
  readonly lbProgram: Program<LiquidityBook>;
  readonly hooksProgram: Program<RewarderHook>;

  constructor(config: ILiquidityBookConfig) {
    // Initialize the services here
    this.connection = new Connection(
      config.options?.rpcUrl || CONFIG[config.mode].rpc,
      config.options?.commitmentOrConfig || "confirmed",
    );

    const provider = new AnchorProvider(
      this.connection,
      {} as Wallet,
      AnchorProvider.defaultOptions(),
    );
    this.mode = config.mode;

    if (config.mode === MODE.DEVNET) {
      this.lbProgram = new Program(LiquidityBookIDLDevnet, provider);
      this.hooksProgram = new Program(MdmaIDLDevnet, provider);
    } else {
      this.lbProgram = new Program(LiquidityBookIDL, provider);
      this.hooksProgram = new Program(MdmaIDL, provider);
    }
  }
}
