import { utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from './base';
import { SarosDLMMPair } from './pair';
import { BinArrayManager } from '../utils/pair/bin-manager';
import {
  CreatePairParams,
  CreatePairResponse,
} from '../types';
import { getIdFromPrice } from '../utils/price';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { PairServiceError } from '../utils/errors';

export class SarosDLMM extends SarosBaseService {
  constructor(config: SarosConfig) {
    super(config);
  }

public async getPair(pairAddress: PublicKey): Promise<SarosDLMMPair> {
  const pair = new SarosDLMMPair(this.config, pairAddress);
  await pair.refetchStates();
  return pair;
}

public async getMultiplePairs(pairAddresses: PublicKey[]): Promise<SarosDLMMPair[]> {
  return await Promise.all(pairAddresses.map((addr) => this.getPair(addr)));
}

  /**
   * Get list of all Saros DLMM pair addresses
   */
  public async getAllPairAddresses(): Promise<string[]> {
    try {
      const programId = this.getDexProgramId();
      const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
      if (!pairAccount) throw PairServiceError.NoPairFound;

      const accounts = await this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 0, bytes: bs58.encode(pairAccount.discriminator) } }],
      });

      if (accounts.length === 0) throw PairServiceError.NoPairFound;

      return accounts
        .filter(
          (acc) =>
            acc.account.owner.toString() === programId.toString() && acc.account.data.length >= 8
        )
        .map((acc) => acc.pubkey.toString());
    } catch (error) {
      if (error instanceof PairServiceError) throw error;
      throw PairServiceError.NoPairFound;
    }
  }

  /**
   * Returns a transaction to create a new pair on-chain.
   */
  public async createNewPair(params: CreatePairParams): Promise<CreatePairResponse> {
    const { baseToken, quoteToken, binStep, ratePrice, payer } = params;

    if (ratePrice <= 0) throw PairServiceError.InvalidPrice;
    if (binStep < 1 || binStep > 10000) throw PairServiceError.InvalidBinStep;

    try {
      const tokenX = new PublicKey(baseToken.mintAddress);
      const tokenY = new PublicKey(quoteToken.mintAddress);

      const id = getIdFromPrice(ratePrice, binStep, baseToken.decimals, quoteToken.decimals);
      const binArrayIndex = BinArrayManager.calculateBinArrayIndex(id);

      const tx = new Transaction();

      // PDAs
      const binStepConfig = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('bin_step_config')),
          this.lbConfig.toBuffer(),
          new Uint8Array([binStep]),
        ],
        this.lbProgram.programId
      )[0];

      const quoteAssetBadge = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')),
          this.lbConfig.toBuffer(),
          tokenY.toBuffer(),
        ],
        this.lbProgram.programId
      )[0];

      const pair = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('pair')),
          this.lbConfig.toBuffer(),
          tokenX.toBuffer(),
          tokenY.toBuffer(),
          new Uint8Array([binStep]),
        ],
        this.lbProgram.programId
      )[0];

      // Initialize pair
      const initializePairIx = await this.lbProgram.methods
        .initializePair(id)
        .accountsPartial({
          liquidityBookConfig: this.lbConfig,
          binStepConfig,
          quoteAssetBadge,
          pair,
          tokenMintX: tokenX,
          tokenMintY: tokenY,
          user: payer,
        })
        .instruction();

      tx.add(initializePairIx);

      // Initialize current + neighbor bin arrays
      await BinArrayManager.addInitializeBinArrayInstruction(
        binArrayIndex,
        pair,
        payer,
        tx,
        this.connection,
        this.lbProgram
      );
      await BinArrayManager.addInitializeBinArrayInstruction(
        binArrayIndex + 1,
        pair,
        payer,
        tx,
        this.connection,
        this.lbProgram
      );

      const binArrayLower = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        pair,
        this.lbProgram.programId
      );
      const binArrayUpper = BinArrayManager.getBinArrayAddress(
        binArrayIndex + 1,
        pair,
        this.lbProgram.programId
      );

      return {
        transaction: tx,
        pair: pair.toString(),
        binArrayLower: binArrayLower.toString(),
        binArrayUpper: binArrayUpper.toString(),
        hooksConfig: this.hooksConfig.toString(),
        activeBin: Number(id),
      };
    } catch (error) {
      if (error instanceof PairServiceError) throw error;
      throw PairServiceError.PairCreationFailed;
    }
  }

  /**
   * Listen for new pair addresses being created and call postTxFunction with the new address
   */
  public async listenNewPairAddress(
    postTxFunction: (address: string) => Promise<void>
  ) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    const subscriptionId = this.connection.onLogs(
      LB_PROGRAM_ID,
      (logInfo) => {
        if (!logInfo.err) {
          for (const log of logInfo.logs || []) {
            if (log.includes('Instruction: InitializePair')) {
              this.getPairAddressFromLogs(logInfo.signature).then(postTxFunction);
            }
          }
        }
      },
      'finalized'
    );
    return () => this.connection.removeOnLogsListener(subscriptionId);
  }

  private async getPairAddressFromLogs(signature: string) {
    const parsedTx = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!parsedTx) throw new Error('Transaction not found');

    const message = TransactionMessage.decompile(parsedTx.transaction.message);
    const initializePairStruct = LiquidityBookIDL.instructions.find(
      (ix) => ix.name === 'initialize_pair'
    )!;
    const discriminator = Buffer.from(initializePairStruct.discriminator);

    for (const ix of message.instructions) {
      if (ix.data.subarray(0, 8).equals(discriminator)) {
        //@ts-ignore
        const accounts = initializePairStruct.accounts.map((item, i) => ({
          name: item.name,
          address: ix.keys[i].pubkey.toString(),
        }));
        return accounts.find((a) => a.name === 'pair')?.address || '';
      }
    }
    return '';
  }

  /**
   * Find pairs by token mints
   */
public static async findPoolsByTokens(
  config: SarosConfig,
  tokenA: PublicKey,
  tokenB: PublicKey
): Promise<string[]> {
  const service = new SarosDLMM(config);
  const programId = service.getDexProgramId();

const accounts = await Promise.all([
  service.connection.getProgramAccounts(new PublicKey(programId), {
    filters: [
      { memcmp: { offset: 43, bytes: tokenA.toBase58() } },
      { memcmp: { offset: 75, bytes: tokenB.toBase58() } },
    ],
  }),
  service.connection.getProgramAccounts(new PublicKey(programId), {
    filters: [
      { memcmp: { offset: 43, bytes: tokenB.toBase58() } },
      { memcmp: { offset: 75, bytes: tokenA.toBase58() } },
    ],
  }),
]);

  return [...accounts[0], ...accounts[1]].map((acc) => acc.pubkey.toString());
}

}
