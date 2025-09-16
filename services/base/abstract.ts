import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Idl, Program, Wallet } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ILiquidityBookConfig, MODE } from '../../types';
import { RPC_CONFIG } from '../../constants';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';
import MdmaIDL from '../../constants/idl/mdma_hook.json';
import LiquidityBookIDLDevnet from '../../constants/idl_devnet/liquidity_book.json';
import MdmaIDLDevnet from '../../constants/idl_devnet/mdma_hook.json';

export abstract class LiquidityBookAbstract {
  connection: Connection;
  lbProgram!: Program<Idl>;
  hooksProgram!: Program<Idl>;
  mode!: MODE;

  constructor(config: ILiquidityBookConfig) {
    // Initialize RPC connection
    this.connection = new Connection(
      config.options?.rpcUrl || RPC_CONFIG[config.mode].rpc,
      config.options?.commitmentOrConfig || 'confirmed',
    );

    const provider = new AnchorProvider(
      this.connection,
      {} as Wallet,
      AnchorProvider.defaultOptions(),
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

  protected async getTokenProgram(address: PublicKey): Promise<PublicKey> {
    const account = await this.connection.getParsedAccountInfo(address);
    const owner = account.value?.owner.toBase58();

    return owner === TOKEN_PROGRAM_ID.toBase58() ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
  }

  public getDexName(): string {
    return 'Saros DLMM';
  }

  public getDexProgramId(): PublicKey {
    return this.lbProgram.programId;
  }

  get lbConfig(): PublicKey {
    if (this.mode === MODE.DEVNET) {
      return new PublicKey('DK6EoxvbMxJTkgcTAYfUnKyDZUTKb6wwPUFfpWsgeiR9');
    }
    return new PublicKey('BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8');
  }

  get hooksConfig(): PublicKey {
    if (this.mode === MODE.DEVNET) {
      return new PublicKey('2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES');
    }
    return new PublicKey('DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF');
  }
}
