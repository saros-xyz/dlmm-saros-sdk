import { PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { utils } from '@coral-xyz/anchor';
import { SarosBaseService, SarosConfig } from './base/index';
import { SarosDLMMPair } from './pair';
import { CreatePairParams, CreatePairResponse } from '../types';
import { getIdFromPrice } from '../utils/price';
import { extractPairFromTx } from '../utils/transaction';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { SarosDLMMError } from '../utils/errors';
import { deriveBinStepConfigPDA, deriveQuoteAssetBadgePDA } from '../utils/pda';
import { calculateBinArrayIndex, getBinArrayAddresses, initializeMultipleBinArrays } from '../utils/bin-arrays';

export class SarosDLMM extends SarosBaseService {
  constructor(config: SarosConfig) {
    super(config);
  }

  /**
   * Create a new pair/pool
   */
  public async createPair(params: CreatePairParams): Promise<CreatePairResponse> {
    const { tokenX, tokenY, binStep, ratePrice, payer } = params;

    if (ratePrice <= 0) throw SarosDLMMError.InvalidPrice();
    if (binStep < 1 || binStep > 10000) throw SarosDLMMError.InvalidBinStep();

    try {
      const tokenXMint = tokenX.mintAddress;
      const tokenYMint = tokenY.mintAddress;
      const id = getIdFromPrice(ratePrice, binStep, tokenX.decimals, tokenY.decimals);

      const tx = new Transaction();

      // Derive pair PDA address
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

      // Derive bin step config PDA
      const binStepConfig = deriveBinStepConfigPDA(this.lbConfig, binStep, this.lbProgram.programId);

      // Derive quote asset badge PDA
      const quoteAssetBadge = deriveQuoteAssetBadgePDA(this.lbConfig, tokenYMint, this.lbProgram.programId);

      // Calculate bin array addresses
      const binArrayIndex = calculateBinArrayIndex(id);
      const { binArrayLower, binArrayUpper } = getBinArrayAddresses(binArrayIndex, pair, this.lbProgram.programId);

      // Initialize pair instruction
      const initializePairIx = await this.lbProgram.methods
        .initializePair(id)
        .accountsPartial({
          liquidityBookConfig: this.lbConfig,
          binStepConfig: binStepConfig,
          quoteAssetBadge: quoteAssetBadge,
          pair: pair,
          tokenMintX: tokenXMint,
          tokenMintY: tokenYMint,
          user: payer,
        })
        .instruction();

      tx.add(initializePairIx);

      // Initialize bin arrays
      await initializeMultipleBinArrays(
        [binArrayIndex, binArrayIndex + 1],
        pair,
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
      SarosDLMMError.handleError(error, SarosDLMMError.PairCreationFailed());
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
    const programId = this.getDexProgramId();
    const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
    if (!pairAccount) throw SarosDLMMError.NoPairFound();

    const accounts = await this.connection.getProgramAccounts(new PublicKey(programId), {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(pairAccount.discriminator) } }],
    });

    if (accounts.length === 0) throw SarosDLMMError.NoPairFound();

    return accounts
      .filter((acc) => acc.account.owner.toString() === programId.toString() && acc.account.data.length >= 8)
      .map((acc) => acc.pubkey.toString());
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
   * Search for pairs by one or two token mints
   */
  public async findPairs(mintA: PublicKey, mintB?: PublicKey): Promise<string[]> {
    const programId = this.getDexProgramId();

    const [accountsX, accountsY] = await Promise.all([
      this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 43, bytes: mintA.toBase58() } }],
      }),
      this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 75, bytes: mintA.toBase58() } }],
      }),
    ]);

    let matches = [...accountsX, ...accountsY];

    if (mintB) {
      // filter results to only those where other side is mintB
      matches = matches.filter((acc) => {
        const data = acc.account.data;
        const tokenX = new PublicKey(data.slice(43, 75));
        const tokenY = new PublicKey(data.slice(75, 107));
        return (tokenX.equals(mintA) && tokenY.equals(mintB)) || (tokenX.equals(mintB) && tokenY.equals(mintA));
      });
    }

    return matches.map((acc) => acc.pubkey.toString());
  }
}
