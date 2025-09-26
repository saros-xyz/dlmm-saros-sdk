import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Idl, Program, Wallet } from '@coral-xyz/anchor';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';
import MdmaIDL from '../../constants/idl/mdma_hook.json';
import LiquidityBookIDLDevnet from '../../constants/idl_devnet/liquidity_book.json';
import MdmaIDLDevnet from '../../constants/idl_devnet/mdma_hook.json';
import { MODE } from '../../types/config';
import { DLMM_PROGRAM_IDS } from '../../constants';

export interface SarosConfig {
  mode: MODE;
  connection: Connection;
}

export abstract class SarosBaseService {
  protected config: SarosConfig;
  connection: Connection;
  lbProgram!: Program<Idl>;
  hooksProgram!: Program<Idl>;

  constructor(config: SarosConfig) {
    this.config = config;

    // Inherit Connection
    this.connection = config.connection;

    const provider = new AnchorProvider(
      this.connection,
      {} as Wallet,
      AnchorProvider.defaultOptions()
    );

    if (config.mode === MODE.DEVNET) {
      this.lbProgram = new Program(LiquidityBookIDLDevnet as Idl, provider);
      this.hooksProgram = new Program(MdmaIDLDevnet as Idl, provider);
    } else {
      // MODE.MAINNET or MODE.TESTNET
      this.lbProgram = new Program(LiquidityBookIDL as Idl, provider);
      this.hooksProgram = new Program(MdmaIDL as Idl, provider);
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
