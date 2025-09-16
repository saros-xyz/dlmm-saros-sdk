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
      const initializebinArrayConfigTx = await lbProgram.methods
        .initializeBinArray(binArrayIndex)
        .accountsPartial({ pair: pair, binArray: binArray, user: payer })
        .instruction();
      transaction.add(initializebinArrayConfigTx);
    }
  }

  public static calculateBinArrayRange(activeId: number): {
    lower: number;
    current: number;
    upper: number;
  } {
    const currentBinArrayIndex = this.calculateBinArrayIndex(activeId);
    return {
      lower: currentBinArrayIndex - 1,
      current: currentBinArrayIndex,
      upper: currentBinArrayIndex + 1,
    };
  }
}
