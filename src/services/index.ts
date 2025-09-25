import { utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from './base';
import { SarosDLMMPair } from './pair';
import { BinArrayManager } from '../utils/pair/bin-manager';
import {
  CreatePairParams,
  DLMMPairAccount,
  CreatePairResponse,
} from '../types';
import { getIdFromPrice } from '../utils/price';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import { PairServiceError } from '../utils/errors';

export class SarosDLMM extends SarosBaseService {
  /**
   * Get a SarosDLMMPair instance with loaded pair data
   */
  public static async createPair(config: SarosConfig, pairAddress: PublicKey): Promise<SarosDLMMPair> {
    return await SarosDLMMPair.create(config, pairAddress);
  }

  // /**
  //  * Get multiple SarosDLMMPair instances
  //  */
  // public static async createMultiplePairs(
  //   config: SarosConfig,
  //   pairAddresses: PublicKey[]
  // ): Promise<SarosDLMMPair[]> {
  //   return await SarosDLMMPair.createMultiple(config, pairAddresses);
  // }

  /**
   * Get list of all Saros DLMM pair addresses
   */
  public static async getAllPairAddresses(config: SarosConfig): Promise<string[]> {
    const service = new SarosDLMM(config);
    try {
      const programId = service.getDexProgramId();
      const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
      if (!pairAccount) throw PairServiceError.NoPairFound;

      const accounts = await service.connection.getProgramAccounts(new PublicKey(programId), {
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
   * Returns a transaction to create a new pair on-chain. Requires a new token pair or a new binStep and ratePrice.
   */
  public static async createNewPair(config: SarosConfig, params: CreatePairParams): Promise<CreatePairResponse> {
    const service = new SarosDLMM(config);
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
          service.lbConfig.toBuffer(),
          new Uint8Array([binStep]),
        ],
        service.lbProgram.programId
      )[0];

      const quoteAssetBadge = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')),
          service.lbConfig.toBuffer(),
          tokenY.toBuffer(),
        ],
        service.lbProgram.programId
      )[0];

      const pair = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode('pair')),
          service.lbConfig.toBuffer(),
          tokenX.toBuffer(),
          tokenY.toBuffer(),
          new Uint8Array([binStep]),
        ],
        service.lbProgram.programId
      )[0];

      // Initialize pair
      const initializePairIx = await service.lbProgram.methods
        .initializePair(id)
        .accountsPartial({
          liquidityBookConfig: service.lbConfig,
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
        service.connection,
        service.lbProgram
      );
      await BinArrayManager.addInitializeBinArrayInstruction(
        binArrayIndex + 1,
        pair,
        payer,
        tx,
        service.connection,
        service.lbProgram
      );

      const binArrayLower = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        pair,
        service.lbProgram.programId
      );
      const binArrayUpper = BinArrayManager.getBinArrayAddress(
        binArrayIndex + 1,
        pair,
        service.lbProgram.programId
      );

      return {
        transaction: tx,
        pair: pair.toString(),
        binArrayLower: binArrayLower.toString(),
        binArrayUpper: binArrayUpper.toString(),
        hooksConfig: service.hooksConfig.toString(),
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
  public static async listenNewPairAddress(
    config: SarosConfig,
    postTxFunction: (address: string) => Promise<void>
  ) {
    const service = new SarosDLMM(config);
    const LB_PROGRAM_ID = service.getDexProgramId();
    const subscriptionId = service.connection.onLogs(
      LB_PROGRAM_ID,
      (logInfo) => {
        if (!logInfo.err) {
          for (const log of logInfo.logs || []) {
            if (log.includes('Instruction: InitializePair')) {
              service.getPairAddressFromLogs(logInfo.signature).then(postTxFunction);
            }
          }
        }
      },
      'finalized'
    );
    return () => service.connection.removeOnLogsListener(subscriptionId);
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
    const allPairs = await SarosDLMM.getAllPairAddresses(config);
    const service = new SarosDLMM(config);

    const matchingPairs: string[] = [];

    for (const pairAddress of allPairs) {
      try {
        //@ts-ignore
        const pairInfo: DLMMPairAccount = await service.lbProgram.account.pair.fetch(new PublicKey(pairAddress));

        if (
          (pairInfo.tokenMintX.equals(tokenA) && pairInfo.tokenMintY.equals(tokenB)) ||
          (pairInfo.tokenMintX.equals(tokenB) && pairInfo.tokenMintY.equals(tokenA))
        ) {
          matchingPairs.push(pairAddress);
        }
      } catch {
        // Skip invalid pairs
        continue;
      }
    }

    return matchingPairs;
  }
}
