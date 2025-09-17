import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BIN_ARRAY_SIZE } from '../../constants';

export class BinArrayManager {
  public static getBinArrayAddress(
    binArrayIndex: number,
    pair: PublicKey,
    programId: PublicKey
  ): PublicKey {
    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      programId
    )[0];

    return binArray;
  }

  public static calculateBinArrayIndex(binId: number): number {
    return Math.floor(binId / BIN_ARRAY_SIZE);
  }

  public static async addInitializeBinArrayInstruction(
    binArrayIndex: number,
    pair: PublicKey,
    payer: PublicKey,
    transaction: Transaction,
    connection: any,
    lbProgram: any
  ): Promise<void> {
    const binArray = this.getBinArrayAddress(binArrayIndex, pair, lbProgram.programId);
    const binArrayInfo = await connection.getAccountInfo(binArray);

    if (!binArrayInfo) {
      const initializeBinArrayConfigTx = await lbProgram.methods
        .initializeBinArray(new BN(binArrayIndex))
        .accountsPartial({ pair: pair, binArray: binArray, user: payer })
        .instruction();
      transaction.add(initializeBinArrayConfigTx);
    }
  }

  public static calculateBinArrayRange(activeId: number, arrayRange: number = 1): number[] {
    const activeBinArrayIndex = this.calculateBinArrayIndex(activeId);
    const indices: number[] = [];

    for (let i = -Math.floor(arrayRange / 2); i <= Math.floor(arrayRange / 2); i++) {
      indices.push(activeBinArrayIndex + i);
    }

    return indices;
  }
}
