import { BN, utils } from '@coral-xyz/anchor';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { BIN_ARRAY_SIZE } from '../constants';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { getIdFromPrice } from '../utils/price';
import { DLMMPair } from './pair';
import { DLMMBase } from './base';
import { deriveBinArrayPDA, deriveBinStepConfigPDA, deriveQuoteAssetBadgePDA } from '../utils/pda';
import { DLMMError } from '../error';
import { CreatePairParams, CreatePairResponse } from '../types/pair';
import { extractPairFromTx } from '../utils/logs';

export class SarosSDK extends DLMMBase {
  bufferGas?: number;

  /**
   * Get a DLMMPair instance for pair-specific operations
   * @param pairAddress The address of the pair
   * @returns A DLMMPair instance with cached state
   */
  public async getPair(pairAddress: PublicKey): Promise<DLMMPair> {
    const pair = new DLMMPair(this.config, pairAddress);
    pair.bufferGas = this.bufferGas;
    await pair.refreshState();
    return pair;
  }

  public async getPairAccount(pair: PublicKey) {
    //@ts-ignore
    return await this.lbProgram.account.pair.fetch(pair);
  }

  public async createPair(params: CreatePairParams): Promise<CreatePairResponse> {
    const { tokenX, tokenY, binStep, ratePrice, payer } = params;
    const id = getIdFromPrice(ratePrice || 1, binStep, tokenX.decimal, tokenY.decimal);
    let binArrayIndex = id / BIN_ARRAY_SIZE;

    if (id % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
      binArrayIndex -= 1;
    }

    const tx = new Transaction();

    const binStepConfig = deriveBinStepConfigPDA(this.lbConfig!, binStep, this.lbProgram.programId);
    const quoteAssetBadge = deriveQuoteAssetBadgePDA(this.lbConfig!, tokenY.mintAddress, this.lbProgram.programId);

    const pair = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('pair')),
        this.lbConfig!.toBuffer(),
        tokenX.mintAddress.toBuffer(),
        tokenY.mintAddress.toBuffer(),
        new Uint8Array([binStep]),
      ],
      this.lbProgram.programId
    )[0];

    const initializePairConfigTx = await this.lbProgram.methods
      .initializePair(id)
      .accountsPartial({
        liquidityBookConfig: this.lbConfig!,
        binStepConfig: binStepConfig,
        quoteAssetBadge: quoteAssetBadge,
        pair: pair,
        tokenMintX: tokenX.mintAddress,
        tokenMintY: tokenY.mintAddress,
        user: payer,
      })
      .instruction();

    tx.add(initializePairConfigTx);

    const binArrayLower = deriveBinArrayPDA(pair, binArrayIndex, this.lbProgram.programId);
    const binArrayUpper = deriveBinArrayPDA(pair, binArrayIndex + 1, this.lbProgram.programId);

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
      transaction: tx,
      pair: pair,
      binArrayLower,
      binArrayUpper,
      hooksConfig: this.hooksConfig,
      activeBin: Number(id),
    };
  }

  public async getAllPairAddresses() {
    const programId = this.getDexProgramId();
    const connection = this.connection;
    const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
    const pairAccountDiscriminator = pairAccount ? pairAccount.discriminator : undefined;

    if (!pairAccountDiscriminator) {
      throw new DLMMError('Pair account not found', 'PAIR_ACCOUNT_NOT_FOUND');
    }

    const accounts = await connection.getProgramAccounts(new PublicKey(programId), {
      filters: [
        {
          memcmp: { offset: 0, bytes: bs58.encode(pairAccountDiscriminator) },
        },
      ],
    });
    if (accounts.length === 0) {
      throw new DLMMError('Pair not found', 'NO_PAIRS_FOUND');
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
