import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BIN_ARRAY_SIZE } from '../constants';
import { SarosDLMMError } from './errors';

export class BinArrays {
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
   * Get adjacent hook bin array addresses (lower and upper) in one call
   */
  public static getHookBinArrayAddresses(
    hook: PublicKey,
    programId: PublicKey,
    binArrayIndex: number
  ): { hookBinArrayLower: PublicKey; hookBinArrayUpper: PublicKey } {
    return {
      hookBinArrayLower: this.getHookBinArrayAddress(hook, programId, binArrayIndex),
      hookBinArrayUpper: this.getHookBinArrayAddress(hook, programId, binArrayIndex + 1),
    };
  }

  /**
   * Get adjacent bin array addresses (lower and upper) in one call
   */
  public static getBinArrayAddresses(
    binArrayIndex: number,
    pairAddress: PublicKey,
    programId: PublicKey
  ): { binArrayLower: PublicKey; binArrayUpper: PublicKey } {
    return {
      binArrayLower: this.getBinArrayAddress(binArrayIndex, pairAddress, programId),
      binArrayUpper: this.getBinArrayAddress(binArrayIndex + 1, pairAddress, programId),
    };
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
      const addresses = indexes.map((idx) => this.getBinArrayAddress(idx, pairAddress, programId));

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
   * Get bin arrays for quote calculations with fallback handling
   */
  public static async getQuoteBinArrays(
    activeId: number,
    pairAddress: PublicKey,
    lbProgram: any
  ): Promise<{ binArrays: any[]; binArrayIndexes: number[] }> {
    const currentBinArrayIndex = this.calculateBinArrayIndex(activeId);
    const binArrayIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = binArrayIndexes.map((idx) =>
      this.getBinArrayAddress(idx, pairAddress, lbProgram.programId)
    );

    const binArrays = await Promise.all(
      binArrayAddresses.map((address, i) =>
        lbProgram.account.binArray.fetch(address).catch(() => ({
          index: binArrayIndexes[i],
          bins: [],
        }))
      )
    );

    return { binArrays, binArrayIndexes };
  }

  /**
   * Get bin array reserves with adjacent fallback logic
   */
  public static async getBinArrayWithAdjacent(
    binArrayIndex: number,
    pairAddress: PublicKey,
    lbProgram: any
  ): Promise<{ bins: any[]; index: number }> {
    const current = this.getBinArrayAddress(binArrayIndex, pairAddress, lbProgram.programId);
    const { bins: currentBins } = await lbProgram.account.binArray.fetch(current);

    try {
      const next = this.getBinArrayAddress(binArrayIndex + 1, pairAddress, lbProgram.programId);
      const { bins: nextBins } = await lbProgram.account.binArray.fetch(next);
      return { bins: [...currentBins, ...nextBins], index: binArrayIndex };
    } catch {
      try {
        const prev = this.getBinArrayAddress(binArrayIndex - 1, pairAddress, lbProgram.programId);
        const { bins: prevBins } = await lbProgram.account.binArray.fetch(prev);
        return { bins: [...prevBins, ...currentBins], index: binArrayIndex - 1 };
      } catch {
        return { bins: currentBins, index: binArrayIndex };
      }
    }
  }

  /**
   * Get bin arrays and hook bin arrays for liquidity removal
   */
  public static getBinArraysForRemoval(
    index: number,
    pairAddress: PublicKey,
    hook: PublicKey,
    lbProgramId: PublicKey,
    hooksProgramId: PublicKey
  ): {
    binArrayLower: PublicKey;
    binArrayUpper: PublicKey;
    hookBinArrayLower: PublicKey;
    hookBinArrayUpper: PublicKey;
  } {
    return {
      binArrayLower: this.getBinArrayAddress(index, pairAddress, lbProgramId),
      binArrayUpper: this.getBinArrayAddress(index + 1, pairAddress, lbProgramId),
      hookBinArrayLower: this.getHookBinArrayAddress(hook, hooksProgramId, index),
      hookBinArrayUpper: this.getHookBinArrayAddress(hook, hooksProgramId, index + 1),
    };
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

    const binArrayAddresses = binArrayIndexes.map((idx) =>
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
            user: payer,
          })
          .instruction();
        transaction.add(ix);
      }
    }
  }
}
