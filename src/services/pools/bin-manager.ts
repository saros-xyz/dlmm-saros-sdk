import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BIN_ARRAY_SIZE } from '../../constants';

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
}
