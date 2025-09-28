import { PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from './base/index';
import { SarosDLMMPair } from './pair';
import { Pairs } from '../utils/pairs';
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

      const tx = new Transaction();

      const { pair, binArrayLower, binArrayUpper } = await Pairs.createPairWithBinArrays(
        this.lbConfig,
        tokenXMint,
        tokenYMint,
        binStep,
        id,
        payer,
        tx,
        this.connection,
        this.lbProgram
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
    await pair.refetchState();
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
    return Pairs.findPairsByTokens(mintAddress, this.connection, this.getDexProgramId());
  }
}
