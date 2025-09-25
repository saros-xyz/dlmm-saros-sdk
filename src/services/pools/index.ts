import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from '../base';
import { BinArrayManager } from './bin-manager';
import { BIN_ARRAY_SIZE } from '../../constants';
import {
  CreatePoolParams,
  DLMMPairAccount,
  PoolMetadata,
  GetPoolLiquidityParams,
  PoolLiquidityData,
  BinLiquidityData,
  Bin,
  CreatePoolResponse,
} from '../../types';
import { getIdFromPrice, getPriceFromId } from '../../utils/price';
import { getPairVaultInfo } from '../../utils/vaults';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';
import { PoolServiceError } from './errors';

export class PoolService extends SarosBaseService {
  constructor(config: SarosConfig) {
    super(config);
  }

  public async getPairAccount(pair: PublicKey): Promise<DLMMPairAccount> {
    try {
      //@ts-ignore
      const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
      if (!pairInfo) throw PoolServiceError.PoolNotFound;
      return pairInfo;
    } catch {
      throw PoolServiceError.PoolNotFound;
    }
  }

  public async createPairWithConfig(params: CreatePoolParams): Promise<CreatePoolResponse> {
    const { baseToken, quoteToken, binStep, ratePrice, payer } = params;

    if (ratePrice <= 0) throw PoolServiceError.InvalidPrice;
    if (binStep < 1 || binStep > 10000) throw PoolServiceError.InvalidBinStep;

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
      if (error instanceof PoolServiceError) throw error;
      throw PoolServiceError.PoolCreationFailed;
    }
  }

  public async getPoolMetadata(pair: string): Promise<PoolMetadata> {
    try {
      const pairInfo = await this.getPairAccount(new PublicKey(pair));

      const [baseVault, quoteVault] = await Promise.all([
        getPairVaultInfo(
          { tokenMint: new PublicKey(pairInfo.tokenMintX), pair: new PublicKey(pair) },
          this.connection
        ),
        getPairVaultInfo(
          { tokenMint: new PublicKey(pairInfo.tokenMintY), pair: new PublicKey(pair) },
          this.connection
        ),
      ]);

      const [baseReserve, quoteReserve, baseMintInfo, quoteMintInfo] = await Promise.all([
        this.connection
          .getTokenAccountBalance(baseVault)
          .catch(() => ({ value: { amount: '0', decimals: 0 } })),
        this.connection
          .getTokenAccountBalance(quoteVault)
          .catch(() => ({ value: { amount: '0', decimals: 0 } })),
        this.connection.getParsedAccountInfo(new PublicKey(pairInfo.tokenMintX)),
        this.connection.getParsedAccountInfo(new PublicKey(pairInfo.tokenMintY)),
      ]);

      const baseDecimals =
        baseMintInfo.value?.data && 'parsed' in baseMintInfo.value.data
          ? (baseMintInfo.value.data.parsed.info.decimals ?? 0)
          : 0;
      const quoteDecimals =
        quoteMintInfo.value?.data && 'parsed' in quoteMintInfo.value.data
          ? (quoteMintInfo.value.data.parsed.info.decimals ?? 0)
          : 0;

      return {
        pair,
        baseToken: {
          mintAddress: pairInfo.tokenMintX.toString(),
          decimals: baseDecimals,
          reserve: baseReserve.value.amount,
        },
        quoteToken: {
          mintAddress: pairInfo.tokenMintY.toString(),
          decimals: quoteDecimals,
          reserve: quoteReserve.value.amount,
        },
        tradeFee: (pairInfo.staticFeeParameters.baseFactor * pairInfo.binStep) / 1e6,
        extra: { hook: pairInfo.hook?.toString() },
      };
    } catch (error) {
      if (error instanceof PoolServiceError) throw error;
      throw PoolServiceError.PoolNotFound;
    }
  }

  public async getAllPoolAddresses(): Promise<string[]> {
    try {
      const programId = this.getDexProgramId();
      const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
      if (!pairAccount) throw PoolServiceError.NoPoolsFound;

      const accounts = await this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [{ memcmp: { offset: 0, bytes: bs58.encode(pairAccount.discriminator) } }],
      });

      if (accounts.length === 0) throw PoolServiceError.NoPoolsFound;

      return accounts
        .filter(
          (acc) =>
            acc.account.owner.toString() === programId.toString() && acc.account.data.length >= 8
        )
        .map((acc) => acc.pubkey.toString());
    } catch (error) {
      if (error instanceof PoolServiceError) throw error;
      throw PoolServiceError.NoPoolsFound;
    }
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
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

  public async getPoolLiquidity(params: GetPoolLiquidityParams): Promise<PoolLiquidityData> {
    const { pair, numberOfBinArrays: arrayRange = 1 } = params;
    try {
      const [metadata, pairAccount] = await Promise.all([
        this.getPoolMetadata(pair.toString()),
        this.getPairAccount(pair),
      ]);

      const binArrayIndices = BinArrayManager.calculateBinArrayRange(
        pairAccount.activeId,
        arrayRange
      );
      const binArrayResults = await Promise.all(
        binArrayIndices.map(async (index) => {
          try {
            const addr = BinArrayManager.getBinArrayAddress(index, pair, this.getDexProgramId());
            //@ts-ignore
            const acc = await this.lbProgram.account.binArray.fetch(addr);
            return { index, bins: acc.bins };
          } catch {
            return { index, bins: [] };
          }
        })
      );

      const bins: BinLiquidityData[] = [];
      binArrayResults.forEach(({ index, bins: arr }) => {
        arr.forEach((bin: Bin, binIdx: number) => {
          if (bin.reserveX.gt(new BN(0)) || bin.reserveY.gt(new BN(0))) {
            const binId = index * BIN_ARRAY_SIZE + binIdx;
            const price = getPriceFromId(
              pairAccount.binStep,
              binId,
              metadata.baseToken.decimals,
              metadata.quoteToken.decimals
            );
            bins.push({
              binId,
              price,
              baseReserve: Number(bin.reserveX) / 10 ** metadata.baseToken.decimals,
              quoteReserve: Number(bin.reserveY) / 10 ** metadata.quoteToken.decimals,
            });
          }
        });
      });

      bins.sort((a, b) => a.binId - b.binId);

      return { activeBin: pairAccount.activeId, binStep: pairAccount.binStep, bins };
    } catch (error) {
      if (error instanceof PoolServiceError) throw error;
      throw PoolServiceError.PoolNotFound;
    }
  }
}
