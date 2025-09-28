import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BIN_ARRAY_SIZE } from '../../constants';
import { SarosDLMMError } from '../errors';

export class BinArrayManager {
  public static getBinArrayAddress(
    binArrayIndex: number,
    pair: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      programId
    )[0];
  }

  public static calculateBinArrayIndex(binId: number): number {
    return Math.floor(binId / BIN_ARRAY_SIZE);
  }

  public static async addInitializeBinArrayInstruction(
    binArrayIndex: number,
    pair: PublicKey,
    payer: PublicKey,
    transaction: Transaction,
    connection: Connection,
    lbProgram: any
  ): Promise<void> {
    const binArray = this.getBinArrayAddress(binArrayIndex, pair, lbProgram.programId);
    const binArrayInfo = await connection.getAccountInfo(binArray);

    if (!binArrayInfo) {
      const ix = await lbProgram.methods
        .initializeBinArray(new BN(binArrayIndex))
        .accountsPartial({ pair, binArray, user: payer })
        .instruction();
      transaction.add(ix);
    }
  }

  /**
   * Calculate a range of bin array indices around an active binId.
   *
   * @param activeId current active bin id
   * @param arrayRange number of bin arrays to include (default 1 = include the active + 1 neighbor each side)
   */
  public static calculateBinArrayRange(activeId: number, arrayRange: number = 1): number[] {
    const activeIndex = this.calculateBinArrayIndex(activeId);
    const indices: number[] = [];

    for (let i = -Math.floor(arrayRange / 2); i <= Math.floor(arrayRange / 2); i++) {
      indices.push(activeIndex + i);
    }
    return indices;
  }

  /**
   * Get hook bin array PDA for a given hook + index.
   */
  public static getHookBinArrayAddress(
    hook: PublicKey,
    programId: PublicKey,
    index: number
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        hook.toBuffer(),
        new BN(index).toArrayLike(Buffer, 'le', 4),
      ],
      programId
    )[0];
  }

  /**
   * Get valid bin arrays for swap operations
   */
  public static async getSwapBinArrays(
    activeId: number,
    pairAddress: PublicKey,
    connection: Connection,
    programId: PublicKey
  ): Promise<{ binArrayLower: PublicKey; binArrayUpper: PublicKey }> {
    const currentBinArrayIndex = this.calculateBinArrayIndex(activeId);
    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = surroundingIndexes.map((idx) =>
      this.getBinArrayAddress(idx, pairAddress, programId)
    );

    const binArrayAccountsInfo = await connection.getMultipleAccountsInfo(binArrayAddresses);
    const validIndexes = surroundingIndexes.filter((_, i) => binArrayAccountsInfo[i]);

    if (validIndexes.length < 2) {
      throw SarosDLMMError.NoValidBinArrays;
    }

    let binArrayLowerIndex: number;
    let binArrayUpperIndex: number;

    if (validIndexes.length === 2) {
      [binArrayLowerIndex, binArrayUpperIndex] = validIndexes;
    } else {
      const activeOffset = activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] =
        activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    return {
      binArrayLower: this.getBinArrayAddress(binArrayLowerIndex, pairAddress, programId),
      binArrayUpper: this.getBinArrayAddress(binArrayUpperIndex, pairAddress, programId),
    };
  }

  /**
   * Get bin arrays for liquidity operations with initialization support
   */
  public static async getLiquidityBinArrays(
    lowerBinId: number,
    upperBinId: number,
    pairAddress: PublicKey,
    connection: Connection,
    programId: PublicKey,
    transaction?: Transaction,
    payer?: PublicKey,
    lbProgram?: any
  ): Promise<{ binArrayLower: PublicKey; binArrayUpper: PublicKey }> {
    const lowerIndex = this.calculateBinArrayIndex(lowerBinId);
    const upperIndex = this.calculateBinArrayIndex(upperBinId);

    const binArrayLower = this.getBinArrayAddress(lowerIndex, pairAddress, programId);
    const binArrayUpper = this.getBinArrayAddress(upperIndex, pairAddress, programId);

    if (transaction && payer && lbProgram) {
      const indexes = lowerIndex === upperIndex ? [lowerIndex] : [lowerIndex, upperIndex];
      const addresses = indexes.map(idx => this.getBinArrayAddress(idx, pairAddress, programId));

      const accountInfos = await connection.getMultipleAccountsInfo(addresses);
      for (let i = 0; i < indexes.length; i++) {
        if (!accountInfos[i]) {
          const ix = await lbProgram.methods
            .initializeBinArray(new BN(indexes[i]))
            .accountsPartial({ pair: pairAddress, binArray: addresses[i], user: payer })
            .instruction();
          transaction.add(ix);
        }
      }
    }

    return { binArrayLower, binArrayUpper };
  }

  /**
   * Initialize multiple bin arrays in batch
   */
  public static async batchInitializeBinArrays(
    binArrayIndexes: number[],
    pairAddress: PublicKey,
    payer: PublicKey,
    transaction: Transaction,
    connection: Connection,
    lbProgram: any
  ): Promise<void> {
    if (binArrayIndexes.length === 0) return;

    const binArrayAddresses = binArrayIndexes.map(idx =>
      this.getBinArrayAddress(idx, pairAddress, lbProgram.programId)
    );

    const accountInfos = await connection.getMultipleAccountsInfo(binArrayAddresses);
    for (let i = 0; i < binArrayIndexes.length; i++) {
      if (!accountInfos[i]) {
        const ix = await lbProgram.methods
          .initializeBinArray(new BN(binArrayIndexes[i]))
          .accountsPartial({
            pair: pairAddress,
            binArray: binArrayAddresses[i],
            user: payer
          })
          .instruction();
        transaction.add(ix);
      }
    }
  }
}
