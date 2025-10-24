import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';
import RewarderHookIDL from '../../constants/idl/rewarder_hook.json';
import LiquidityBookIDLDevnet from '../../constants/idl_devnet/liquidity_book.json';
import RewarderHookIDLDevnet from '../../constants/idl_devnet/rewarder_hook.json';
import type { LiquidityBook } from '../../constants/idl/liquidity_book';
import type { RewarderHook } from '../../constants/idl/rewarder_hook';
import { MODE } from '../../constants/config';
import { DLMM_PROGRAM_IDS } from '../../constants';

export interface SarosConfig {
  mode: MODE;
  connection: Connection;
}

export abstract class SarosBaseService {
  protected config: SarosConfig;
  connection: Connection;
  lbProgram!: Program<LiquidityBook>;
  hooksProgram!: Program<RewarderHook>;

  constructor(config: SarosConfig) {
    this.config = config;

    // Inherit Connection
    this.connection = config.connection;

    const provider = new AnchorProvider(this.connection, {} as Wallet, AnchorProvider.defaultOptions());

    if (config.mode === MODE.DEVNET) {
      this.lbProgram = new Program(LiquidityBookIDLDevnet as LiquidityBook, provider);
      this.hooksProgram = new Program(RewarderHookIDLDevnet as RewarderHook, provider);
    } else {
      // MODE.MAINNET or MODE.TESTNET
      this.lbProgram = new Program(LiquidityBookIDL as LiquidityBook, provider);
      this.hooksProgram = new Program(RewarderHookIDL as RewarderHook, provider);
    }
  }

  public getDexName(): string {
    return 'Saros DLMM';
  }

  public getDexProgramId(): PublicKey {
    return this.lbProgram.programId;
  }

  get lbConfig(): PublicKey {
    return DLMM_PROGRAM_IDS[this.config.mode].lb;
  }

  get hooksConfig(): PublicKey {
    return DLMM_PROGRAM_IDS[this.config.mode].hooks;
  }
}
