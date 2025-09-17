import { utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { SarosBaseService, SarosConfig } from '../base';
import { BinArrayManager } from './bins';
import { BIN_ARRAY_SIZE } from '../../constants';
import {
  CreatePoolParams,
  DLMMPairAccount,
  PoolMetadata,
  GetPoolLiquidityParams,
  PoolLiquidityData,
  BinLiquidityData,
  Bin,
} from '../../types';
import { getIdFromPrice, getPriceFromId } from '../../utils/price';
import { getPairVaultInfo } from '../../utils/vaults';
import LiquidityBookIDL from '../../constants/idl/liquidity_book.json';
import { PoolServiceError } from './errors';

export class PoolService extends SarosBaseService {
  constructor(config: SarosConfig) {
    super(config);
  }

  public async getPoolAccount(pair: PublicKey): Promise<DLMMPairAccount> {
    try {
      // @ts-ignore
      const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
      if (!pairInfo) throw PoolServiceError.PoolNotFound;
      return pairInfo;
    } catch (_error) {
      throw PoolServiceError.PoolNotFound;
  }

  public async createPairWithConfig(params: CreatePoolParams) {
    const { baseToken, quoteToken, binStep, ratePrice, payer } = params;

    // Validation
    if (ratePrice <= 0) {
      throw PoolServiceError.InvalidPrice;
    }

    if (binStep < 1 || binStep > 10000) {
      throw PoolServiceError.InvalidBinStep;
    }

    try {
      const tokenX = new PublicKey(baseToken.mintAddress);
      const tokenY = new PublicKey(quoteToken.mintAddress);

      const id = getIdFromPrice(ratePrice, binStep, baseToken.decimals, quoteToken.decimals);

      // Use BinArrayManager to calculate bin array index
      const binArrayIndex = BinArrayManager.calculateBinArrayIndex(id);

      const tx = new Transaction();

      // Generate PDAs
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

      // Initialize pair instruction
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

      // Use BinArrayManager to add bin array initialization instructions
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

      // Get bin array addresses for return value
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
        tx,
        pair: pair.toString(),
        binArrayLower: binArrayLower.toString(),
        binArrayUpper: binArrayUpper.toString(),
        hooksConfig: this.hooksConfig.toString(),
        activeBin: Number(id),
      };
    } catch (error) {
      if (error instanceof PoolServiceError) {
        throw error;
      }
      throw PoolServiceError.PoolCreationFailed;
    }
  }

  public async getPoolMetadata(pair: string): Promise<PoolMetadata> {
    try {
      const pairInfo: DLMMPairAccount = await this.getPoolAccount(new PublicKey(pair));

      const basePairVault = await getPairVaultInfo(
        {
          tokenMint: new PublicKey(pairInfo.tokenMintX),
          pair: new PublicKey(pair),
        },
        this.connection
      );
      const quotePairVault = await getPairVaultInfo(
        {
          tokenMint: new PublicKey(pairInfo.tokenMintY),
          pair: new PublicKey(pair),
        },
        this.connection
      );

      const [baseReserve, quoteReserve] = await Promise.all([
        this.connection.getTokenAccountBalance(basePairVault).catch(() => ({
          value: {
            uiAmount: 0,
            amount: '0',
            decimals: 0,
            uiAmountString: '0',
          },
        })),
        this.connection.getTokenAccountBalance(quotePairVault).catch(() => ({
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
    } catch (error) {
      if (error instanceof PoolServiceError) {
        throw error;
      }
      throw PoolServiceError.PoolNotFound;
    }
  }

  public async getAllPoolAddresses(): Promise<string[]> {
    try {
      const programId = this.getDexProgramId();
      const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
      const pairAccountDiscriminator = pairAccount ? pairAccount.discriminator : undefined;

      if (!pairAccountDiscriminator) {
        throw PoolServiceError.PoolNotFound;
      }

      const accounts = await this.connection.getProgramAccounts(new PublicKey(programId), {
        filters: [
          {
            memcmp: { offset: 0, bytes: bs58.encode(pairAccountDiscriminator) },
          },
        ],
      });

      if (accounts.length === 0) {
        throw PoolServiceError.PoolNotFound;
      }

      const poolAddresses = accounts.reduce((addresses: string[], account) => {
        if (account.account.owner.toString() !== programId.toString()) {
          return addresses;
        }
        if (account.account.data.length < 8) {
          return addresses;
        }
        addresses.push(account.pubkey.toString());
        return addresses;
      }, []);

      return poolAddresses;
    } catch (error) {
      if (error instanceof PoolServiceError) {
        throw error;
      }
      throw PoolServiceError.PoolNotFound;
    }
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    const subscriptionId = this.connection.onLogs(
      LB_PROGRAM_ID,
      (logInfo) => {
        if (!logInfo.err) {
          const logs = logInfo.logs || [];
          for (const log of logs) {
            if (log.includes('Instruction: InitializePair')) {
              const signature = logInfo.signature;

              this.getPairAddressFromLogs(signature).then((address) => {
                postTxFunction(address);
              });
            }
          }
        }
      },
      'finalized'
    );

    // return cleanup function
    return () => {
      this.connection.removeOnLogsListener(subscriptionId);
    };
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
      (item) => item.name === 'initialize_pair'
    )!;

    const initializePairDiscriminator = Buffer.from(initializePairStruct.discriminator);

    let pairAddress = '';

    for (const instruction of instructions) {
      const discriminatorInstruction = instruction.data.subarray(0, 8);
      if (!discriminatorInstruction.equals(initializePairDiscriminator)) continue;
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

  public async getPoolLiquidity(params: GetPoolLiquidityParams): Promise<PoolLiquidityData> {
    // fetch 1 bin array on each side of active by default
    const { poolAddress, numberOfBinArrays: arrayRange = 1 } = params;

    try {
      // Get basic pool information
      const [metadata, pairAccount] = await Promise.all([
        this.getPoolMetadata(poolAddress.toString()),
        this.getPoolAccount(poolAddress),
      ]);

      const activeBin = pairAccount.activeId;
      const binStep = pairAccount.binStep;

      // Use BinArrayManager to get bin array indices
      const binArrayIndices = BinArrayManager.calculateBinArrayRange(activeBin, arrayRange);

      // Fetch all bin arrays
      const binArrayPromises = binArrayIndices.map(async (index) => {
        try {
          const binArrayAddress = BinArrayManager.getBinArrayAddress(
            index,
            poolAddress,
            this.getDexProgramId()
          );
          //@ts-ignore
          const binArrayAccount = await this.lbProgram.account.binArray.fetch(binArrayAddress);
          return { index, bins: binArrayAccount.bins };
        } catch {
          // Bin array doesn't exist, return empty
          return { index, bins: [] };
        }
      });

      const binArrayResults = await Promise.all(binArrayPromises);

      // Process all bins with liquidity
      const binLiquidityData: BinLiquidityData[] = [];

      binArrayResults.forEach(({ index: arrayIndex, bins }) => {
        bins.forEach((bin: Bin, binIndex: number) => {
          if (bin.reserveX > 0n || bin.reserveY > 0n) {
            const binId = arrayIndex * BIN_ARRAY_SIZE + binIndex;

            const binPrice = getPriceFromId(
              binStep,
              binId,
              metadata.baseToken.decimals,
              metadata.quoteToken.decimals
            );

            // Convert reserves to human readable amounts
            const baseReserve = Number(bin.reserveX) / Math.pow(10, metadata.baseToken.decimals);
            const quoteReserve = Number(bin.reserveY) / Math.pow(10, metadata.quoteToken.decimals);

            binLiquidityData.push({
              binId,
              price: binPrice,
              baseReserve,
              quoteReserve,
            });
          }
        });
      });

      // Sort bins by binId
      binLiquidityData.sort((a, b) => a.binId - b.binId);

      return {
        activeBin,
        binStep,
        bins: binLiquidityData,
      };
    } catch (error) {
      if (error instanceof PoolServiceError) {
        throw error;
      }
      throw PoolServiceError.PoolNotFound;
    }
  }
}
