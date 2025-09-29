import { BN, utils } from '@coral-xyz/anchor';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import * as spl from '@solana/spl-token';
import {  PublicKey, Transaction, TransactionMessage } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  BIN_ARRAY_SIZE,
} from '../constants';
import LiquidityBookIDL from '../constants/idl/liquidity_book.json';
import {
  BinReserveInfo,
  CreatePairWithConfigParams,
  GetBinArrayParams,
  GetBinsArrayInfoParams,
  GetBinsReserveParams,
  GetUserVaultInfoParams,
} from '../types/services';
import { mulDivBN } from '../utils/math';
import { getIdFromPrice } from '../utils/price';
import { DLMMPair } from './pair';
import { DLMMBase } from './base';
import { getProgram } from '../utils/token';

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

  public async getPositionAccount(position: PublicKey) {
    //@ts-ignore
    return await this.lbProgram.account.position.fetch(position);
  }

  async getBinArray(params: GetBinArrayParams) {
    const { binArrayIndex, pair, payer, transaction } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      this.lbProgram.programId
    )[0];

    if (transaction && payer) {
      const binArrayInfo = await this.connection.getAccountInfo(binArray);

      if (!binArrayInfo) {
        const initializebinArrayConfigTx = await this.lbProgram.methods
          .initializeBinArray(binArrayIndex)
          .accountsPartial({ pair: pair, binArray: binArray, user: payer })
          .instruction();
        transaction.add(initializebinArrayConfigTx);
      }
    }

    return binArray;
  }

  public async getBinArrayInfo(params: GetBinsArrayInfoParams) {
    const { binArrayIndex, pair, payer } = params;
    let resultIndex = binArrayIndex;
    let result = [];

    const binArray = await this.getBinArray({
      binArrayIndex,
      pair,
      payer,
    });

    //@ts-ignore
    const { bins } = await this.lbProgram.account.binArray.fetch(binArray);
    try {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex + 1,
        pair,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);

      result = [...bins, ...res.bins];
    } catch {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex - 1,
        pair,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);
      result = [...res.bins, ...bins];
      resultIndex -= 1;
    }

    return { bins: result, resultIndex };
  }

  public async getBinsReserveInformation(params: GetBinsReserveParams): Promise<BinReserveInfo[]> {
    const { position, pair, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    const { bins, resultIndex } = await this.getBinArrayInfo({
      binArrayIndex,
      pair,
      payer,
    });

    const firstBinIndex = resultIndex * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    const reserveXY = binIds.map((binId: number, index: number) => {
      const liquidityShare = positionInfo.liquidityShares[index]; // Keep as BN
      const activeBin = bins[binId];

      if (activeBin) {
        // keep as BN
        const totalReserveX = activeBin.reserveX;
        const totalReserveY = activeBin.reserveY;
        const totalSupply = activeBin.totalSupply;
        // Use BN math throughout, only convert to number at the end
        const reserveX = totalReserveX.gt(new BN(0))
          ? mulDivBN(liquidityShare, totalReserveX, totalSupply, 'down').toNumber()
          : 0;

        const reserveY = totalReserveY.gt(new BN(0))
          ? mulDivBN(liquidityShare, totalReserveY, totalSupply, 'down').toNumber()
          : 0;

        return {
          reserveX: reserveX,
          reserveY: reserveY,
          totalSupply: totalSupply,
          binId: firstBinId + index,
          binPosistion: binId,
          liquidityShare: positionInfo.liquidityShares[index],
        };
      }
      return {
        reserveX: 0,
        reserveY: 0,
        totalSupply: new BN(0),
        binId: firstBinId + index,
        binPosistion: binId,
        liquidityShare,
      };
    });

    return reserveXY;
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
      [Buffer.from(utils.bytes.utf8.encode('bin_step_config')), this.lbConfig!.toBuffer(), new Uint8Array([binStep])],
      this.lbProgram.programId
    )[0];

    const quoteAssetBadge = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')), this.lbConfig!.toBuffer(), tokenY.toBuffer()],
      this.lbProgram.programId
    )[0];

    const pair = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('pair')),
        this.lbConfig!.toBuffer(),
        tokenX.toBuffer(),
        tokenY.toBuffer(),
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
        tokenMintX: tokenX,
        tokenMintY: tokenY,
        user: payer,
      })
      .instruction();

    tx.add(initializePairConfigTx);

    const binArrayLower = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      this.lbProgram.programId
    )[0];

    const binArrayUpper = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(Number(binArrayIndex) + 1).toArrayLike(Buffer, 'le', 4),
      ],
      this.lbProgram.programId
    )[0];

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


  public async fetchPoolAddresses() {
    const programId = this.getDexProgramId();
    const connection = this.connection;
    const pairAccount = LiquidityBookIDL.accounts.find((acc) => acc.name === 'Pair');
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

  public async getPairVaultInfo(params: {
    tokenAddress: PublicKey;
    pair: PublicKey;
    payer?: PublicKey;
    transaction?: Transaction;
  }) {
    const { tokenAddress, pair, payer, transaction } = params;

    const tokenMint = new PublicKey(tokenAddress);
    const tokenProgram = await getProgram(tokenMint, this.connection);

    const associatedPairVault = spl.getAssociatedTokenAddressSync(tokenMint, pair, true, tokenProgram);

    if (transaction && payer) {
      const infoPairVault = await this.connection.getAccountInfo(associatedPairVault);

      if (!infoPairVault) {
        const pairVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedPairVault,
          pair,
          tokenMint,
          tokenProgram
        );
        transaction.add(pairVaultYInstructions);
      }
    }

    return associatedPairVault;
  }

  public async getUserVaultInfo(params: GetUserVaultInfoParams) {
    const { tokenAddress, payer, transaction } = params;
    const tokenProgram = await getProgram(tokenAddress, this.connection);
    const associatedUserVault = spl.getAssociatedTokenAddressSync(tokenAddress, payer, true, tokenProgram);

    if (transaction) {
      const infoUserVault = await this.connection.getAccountInfo(associatedUserVault);

      if (!infoUserVault) {
        const userVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedUserVault,
          payer,
          tokenAddress,
          tokenProgram
        );
        transaction.add(userVaultYInstructions);
      }
    }
    return associatedUserVault;
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    this.connection.onLogs(
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
    const initializePairStruct = LiquidityBookIDL.instructions.find((item) => item.name === 'initialize_pair')!;

    const initializePairDescrimator = Buffer.from(initializePairStruct!.discriminator);

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
      pairAddress = accounts.find((item: { name: string; address: string }) => item.name === 'pair')?.address || '';
    }
    return pairAddress;
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
