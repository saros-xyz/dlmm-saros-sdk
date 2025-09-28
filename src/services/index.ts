import { utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from './base/index';
import { SarosDLMMPair } from './pair';
import { BinArrayManager } from '../utils/pair/bin-manager';
import { CreatePairParams, CreatePairResponse } from '../types';
import { getIdFromPrice } from '../utils/price';
import { extractPairFromTx } from '../utils/transaction';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { SarosDLMMError } from '../utils/errors';

export class SarosDLMM extends SarosBaseService {
  constructor(config: SarosConfig) {
    super(config);
  }

  /**
   * Create a new pair/pool
   */
  public async createPair(params: CreatePairParams): Promise<CreatePairResponse> {
    const { tokenX, tokenY, binStep, ratePrice, payer } = params;

    if (ratePrice <= 0) throw SarosDLMMError.InvalidPrice;
    if (binStep < 1 || binStep > 10000) throw SarosDLMMError.InvalidBinStep;

    try {
      const tokenXMint = tokenX.mintAddress;
      const tokenYMint = tokenY.mintAddress;

      const id = getIdFromPrice(ratePrice, binStep, tokenX.decimals, tokenY.decimals);
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
          tokenYMint.toBuffer(),
        ],
        this.lbProgram.programId
      )[0];

      const pair = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('pair')),
          this.lbConfig.toBuffer(),
          tokenXMint.toBuffer(),
          tokenYMint.toBuffer(),
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
          tokenMintX: tokenXMint,
          tokenMintY: tokenYMint,
          user: payer,
        })
        .instruction();

      tx.add(initializePairIx);

      // Initialize current + neighbor bin arrays
      await BinArrayManager.batchInitializeBinArrays(
        [binArrayIndex, binArrayIndex + 1],
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
        pair,
        binArrayLower,
        binArrayUpper,
        hooksConfig: this.hooksConfig,
        activeBin: Number(id),
        binStep,
        tokenX: tokenXMint,
        tokenY: tokenYMint,
      };
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.PairCreationFailed);
    }
  }

  /**
   * Get a pair instance with loaded data
   */
  public async getPair(pairAddress: PublicKey): Promise<SarosDLMMPair> {
    const pair = new SarosDLMMPair(this.config, pairAddress);
    await pair.refetchStates();
    return pair;
  }

  /**
   * Get multiple pair instances with loaded data
   */
  public async getPairs(pairAddresses: PublicKey[]): Promise<SarosDLMMPair[]> {
    return await Promise.all(pairAddresses.map((addr) => this.getPair(addr)));
  }

  /**
   * Get list of all Saros DLMM pair addresses
   */
  public async getAllPairAddresses(): Promise<string[]> {
    try {
      const programId = this.getDexProgramId();
      const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
      if (!pairAccount) throw SarosDLMMError.NoPairFound;

      const accounts = await this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 0, bytes: bs58.encode(pairAccount.discriminator) } }],
      });

      if (accounts.length === 0) throw SarosDLMMError.NoPairFound;

      return accounts
        .filter(
          (acc) =>
            acc.account.owner.toString() === programId.toString() && acc.account.data.length >= 8
        )
        .map((acc) => acc.pubkey.toString());
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.NoPairFound);
    }
  }

  /**
   * Listen for new pair addresses being created and call postTxFunction with the new address
   */
  public async listenForNewPairs(postTxFunction: (address: string) => Promise<void>) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    const subscriptionId = this.connection.onLogs(
      LB_PROGRAM_ID,
      (logInfo) => {
        if (!logInfo.err) {
          for (const log of logInfo.logs || []) {
            if (log.includes('Instruction: InitializePair')) {
              extractPairFromTx(this.connection, logInfo.signature).then((pairAddress) => {
                if (pairAddress) {
                  postTxFunction(pairAddress.toString());
                }
              });
            }
          }
        }
      },
      'finalized'
    );
    return () => this.connection.removeOnLogsListener(subscriptionId);
  }

  /**
   * Search for pairs by token mint
   */
  public async findPairs(mintAddress: PublicKey): Promise<string[]> {
    const programId = this.getDexProgramId();

    const accounts = await Promise.all([
      this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 43, bytes: mintAddress.toBase58() } }],
      }),
      this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 75, bytes: mintAddress.toBase58() } }],
      }),
    ]);

    return [...accounts[0], ...accounts[1]].map((acc) => acc.pubkey.toString());
  }
}
