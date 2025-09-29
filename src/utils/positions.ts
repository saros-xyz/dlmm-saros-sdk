import { PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { utils } from '@coral-xyz/anchor';
import { chunk } from 'lodash';
import { PositionAccount } from '../types';

/**
 * Position utilities for PDA derivation and user position discovery
 */
export class Positions {
  public static derivePositionAddress(positionMint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      programId
    )[0];
  }

  public static dervicePositionHookAddress(hook: PublicKey, position: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), position.toBuffer()],
      programId
    )[0];
  }

  public static derivePositionAccount(positionMint: PublicKey, payer: PublicKey): PublicKey {
    return spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);
  }

  public static async getMultiplePositionAccounts(
    positionPdas: PublicKey[],
    pairAddress: PublicKey,
    lbProgram: any
  ): Promise<PositionAccount[]> {
    try {
      const chunks = chunk(positionPdas, 100);
      const all: PositionAccount[] = [];

      for (const c of chunks) {
        const positions = await lbProgram.account.position.fetchMultiple(c);
        all.push(
          ...positions
            .map((p: any, i: number) =>
              p && p.pair.toString() === pairAddress.toString() ? { ...p, position: c[i] } : null
            )
            .filter(Boolean)
        );
      }
      return all;
    } catch {
      return this.getPositionAccount(positionPdas, pairAddress, lbProgram);
    }
  }

  public static async getPositionAccount(
    positionPdas: PublicKey[],
    pairAddress: PublicKey,
    lbProgram: any
  ): Promise<PositionAccount[]> {
    const positions = await Promise.all(
      positionPdas.map(async (pda) => {
        try {
          const p = await lbProgram.account.position.fetch(pda);
          if (p.pair.toString() !== pairAddress.toString()) return null;
          return { ...p, position: pda };
        } catch {
          return null;
        }
      })
    );

    return positions.filter(Boolean);
  }
}
