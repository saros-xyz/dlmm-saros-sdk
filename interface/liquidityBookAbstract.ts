import {
	AnchorProvider,
	type Idl,
	Program,
	type Wallet,
} from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";

import { CONFIG } from "../constants/config";
import MdmaIDL from "../constants/idl/mdma_hook.json";
import { type ILiquidityBookConfig, MODE } from "../types";
import MdmaIDLDevnet from "../constants/idl_devnet/mdma_hook.json";
import LiquidityBookIDL from "../constants/idl/liquidity_book.json";
import type { LiquidityBook } from "../constants/idl/liquidity_book";
import LiquidityBookIDLDevnet from "../constants/idl_devnet/liquidity_book.json";

export abstract class LiquidityBookAbstract {
	connection: Connection;

	lbProgram!: Program<LiquidityBook>;
	hooksProgram!: Program<Idl>;
	mode!: MODE;

	constructor(config: ILiquidityBookConfig) {
		// Initialize the services heref
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
			this.hooksProgram = new Program(MdmaIDLDevnet as Idl, provider);
			this.lbProgram = new Program<LiquidityBook>(
				LiquidityBookIDLDevnet,
				provider,
			);
		} else {
			this.hooksProgram = new Program(MdmaIDL, provider);
			this.lbProgram = new Program<LiquidityBook>(LiquidityBookIDL, provider);
		}
	}
}
