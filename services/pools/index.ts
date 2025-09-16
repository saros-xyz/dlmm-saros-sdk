import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { LiquidityBookAbstract } from '../base/abstract';
import { BinArrayManager } from './bins';
import { SwapService } from '../swap';
import { BIN_ARRAY_SIZE } from '../../constants';
import {
  CreatePairWithConfigParams,
  DLMMPairAccount,
  PoolMetadata,
  ILiquidityBookConfig,
} from '../../types';
import { getIdFromPrice } from '../../utils/price';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';

export class PoolService extends LiquidityBookAbstract {
  constructor(config: ILiquidityBookConfig) {
    super(config);
  }

  public async getPairAccount(pair: PublicKey): Promise<DLMMPairAccount> {
    //@ts-ignore
    return await this.lbProgram.account.pair.fetch(pair);
  }

  public async createPairWithConfig(params: CreatePairWithConfigParams) {
    const { tokenBase, tokenQuote, binStep, ratePrice, payer } = params;

    const tokenX = new PublicKey(tokenBase.mintAddress);
    const tokenY = new PublicKey(tokenQuote.mintAddress);

    const id = getIdFromPrice(ratePrice || 1, binStep, tokenBase.decimal, tokenQuote.decimal);

    let binArrayIndex = id / BIN_ARRAY_SIZE;

    if (id % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
      binArrayIndex -= 1;
    }

    const tx = new Transaction();

    const binStepConfig = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_step_config')),
        this.lbConfig.toBuffer(),
        new Uint8Array([binStep]),
      ],
      this.lbProgram.programId,
    )[0];

    const quoteAssetBadge = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')),
        this.lbConfig.toBuffer(),
        tokenY.toBuffer(),
      ],
      this.lbProgram.programId,
    )[0];

    const pair = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('pair')),
        this.lbConfig.toBuffer(),
        tokenX.toBuffer(),
        tokenY.toBuffer(),
        new Uint8Array([binStep]),
      ],
      this.lbProgram.programId,
    )[0];

    const initializePairConfigTx = await this.lbProgram.methods
      .initializePair(id)
      .accountsPartial({
        liquidityBookConfig: this.lbConfig,
        binStepConfig: binStepConfig,
        quoteAssetBadge: quoteAssetBadge,
        pair: pair,
        tokenMintX: tokenX,
        tokenMintY: tokenY,
        user: payer,
      })
      .instruction();

    tx.add(initializePairConfigTx);

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      binArrayIndex,
      pair,
      this.lbProgram.programId,
    );

    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      binArrayIndex + 1,
      pair,
      this.lbProgram.programId,
    );

    const initializeBinArrayLowerConfigTx = await this.lbProgram.methods
      .initializeBinArray(binArrayIndex)
      .accountsPartial({ pair: pair, binArray: binArrayLower, user: payer })
      .instruction();

    tx.add(initializeBinArrayLowerConfigTx);

    const initializeBinArrayUpperConfigTx = await this.lbProgram.methods
      .initializeBinArray(new BN(binArrayIndex + 1))
      .accountsPartial({ pair: pair, binArray: binArrayUpper, user: payer })
      .instruction();

    tx.add(initializeBinArrayUpperConfigTx);

    return {
      tx,
      pair: pair.toString(),
      binArrayLower: binArrayLower.toString(),
      binArrayUpper: binArrayUpper.toString(),
      hooksConfig: this.hooksConfig.toString(),
      activeBin: Number(id),
    };
  }

  public async getPoolMetadata(pair: string): Promise<PoolMetadata> {
    const connection = this.connection;
    const pairInfo: DLMMPairAccount = await this.getPairAccount(new PublicKey(pair));

    if (!pairInfo) {
      throw new Error('Pair not found');
    }

    const basePairVault = await this.getPairVaultInfo({
      tokenAddress: new PublicKey(pairInfo.tokenMintX),
      pair: new PublicKey(pair),
    });
    const quotePairVault = await this.getPairVaultInfo({
      tokenAddress: new PublicKey(pairInfo.tokenMintY),
      pair: new PublicKey(pair),
    });

    const [baseReserve, quoteReserve] = await Promise.all([
      connection.getTokenAccountBalance(basePairVault).catch(() => ({
        value: {
          uiAmount: 0,
          amount: '0',
          decimals: 0,
          uiAmountString: '0',
        },
      })),
      connection.getTokenAccountBalance(quotePairVault).catch(() => ({
        value: {
          uiAmount: 0,
          amount: '0',
          decimals: 0,
          uiAmountString: '0',
        },
      })),
    ]);

    return {
      poolAddress: pair,
      baseToken: {
        mintAddress: pairInfo.tokenMintX.toString(),
        decimals: baseReserve.value.decimals,
        reserve: baseReserve.value.amount,
      },
      quoteToken: {
        mintAddress: pairInfo.tokenMintY.toString(),
        decimals: quoteReserve.value.decimals,
        reserve: quoteReserve.value.amount,
      },
      tradeFee: (pairInfo.staticFeeParameters.baseFactor * pairInfo.binStep) / 1e6,
      extra: {
        hook: pairInfo.hook?.toString(),
      },
    };
  }

  private async getPairVaultInfo(params: {
    tokenAddress: PublicKey;
    pair: PublicKey;
    payer?: PublicKey;
    transaction?: Transaction;
  }) {
    const { tokenAddress, pair, payer, transaction } = params;

    const tokenMint = new PublicKey(tokenAddress);
    const tokenProgram = await this.getTokenProgram(tokenMint);

    const associatedPairVault = spl.getAssociatedTokenAddressSync(
      tokenMint,
      pair,
      true,
      tokenProgram,
    );

    if (transaction && payer) {
      const infoPairVault = await this.connection.getAccountInfo(associatedPairVault);

      if (!infoPairVault) {
        const pairVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedPairVault,
          pair,
          tokenMint,
          tokenProgram,
        );
        transaction.add(pairVaultYInstructions);
      }
    }

    return associatedPairVault;
  }

  public async getAllPoolAddresses(): Promise<string[]> {
    const programId = this.getDexProgramId();
    const connection = this.connection;
    const pairAccount = LiquidityBookIDL.accounts.find(acc => acc.name === 'Pair');
    const pairAccountDiscriminator = pairAccount ? pairAccount.discriminator : undefined;

    if (!pairAccountDiscriminator) {
      throw new Error('Pair account not found');
    }

    const accounts = await connection.getProgramAccounts(new PublicKey(programId), {
      filters: [
        {
          memcmp: { offset: 0, bytes: bs58.encode(pairAccountDiscriminator) },
        },
      ],
    });
    if (accounts.length === 0) {
      throw new Error('Pair not found');
    }
    const poolAdresses = accounts.reduce((addresses: string[], account) => {
      if (account.account.owner.toString() !== programId.toString()) {
        return addresses;
      }
      if (account.account.data.length < 8) {
        return addresses;
      }
      addresses.push(account.pubkey.toString());
      return addresses;
    }, []);

    return poolAdresses;
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    this.connection.onLogs(
      LB_PROGRAM_ID,
      logInfo => {
        if (!logInfo.err) {
          const logs = logInfo.logs || [];
          for (const log of logs) {
            if (log.includes('Instruction: InitializePair')) {
              const signature = logInfo.signature;

              this.getPairAddressFromLogs(signature).then(address => {
                postTxFunction(address);
              });
            }
          }
        }
      },
      'finalized',
    );
  }

  private async getPairAddressFromLogs(signature: string) {
    const parsedTransaction = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!parsedTransaction) {
      throw new Error('Transaction not found');
    }

    const compiledMessage = parsedTransaction.transaction.message;
    const message = TransactionMessage.decompile(compiledMessage);
    const instructions = message.instructions;
    const initializePairStruct = LiquidityBookIDL.instructions.find(
      item => item.name === 'initialize_pair',
    )!;

    const initializePairDescrimator = Buffer.from(initializePairStruct.discriminator);

    let pairAddress = '';

    for (const instruction of instructions) {
      const descimatorInstruction = instruction.data.subarray(0, 8);
      if (!descimatorInstruction.equals(initializePairDescrimator)) continue;
      //@ts-ignore
      const accounts = initializePairStruct.accounts.map((item, index) => {
        return {
          name: item.name,
          address: instruction.keys[index].pubkey.toString(),
        };
      });
      pairAddress =
        accounts.find((item: { name: string; address: string }) => item.name === 'pair')?.address ||
        '';
    }
    return pairAddress;
  }

  public async quote(params: {
    amount: number;
    metadata: PoolMetadata;
    optional: {
      isExactInput: boolean;
      swapForY: boolean;
      slippage: number;
    };
  }) {
    const { amount, metadata, optional } = params;

    // Use SwapService to get a quote
    const swapService = new SwapService({ mode: this.mode });

    return await swapService.getQuote({
      amount: BigInt(amount),
      isExactInput: optional.isExactInput,
      pair: new PublicKey(metadata.poolAddress),
      slippage: optional.slippage,
      swapForY: optional.swapForY,
      tokenBase: new PublicKey(metadata.baseToken.mintAddress),
      tokenBaseDecimal: metadata.baseToken.decimals,
      tokenQuote: new PublicKey(metadata.quoteToken.mintAddress),
      tokenQuoteDecimal: metadata.quoteToken.decimals,
    });
  }
}
