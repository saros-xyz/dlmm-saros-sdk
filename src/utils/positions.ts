import { PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { chunk } from 'lodash';
import { PositionAccount } from '../types';

export function derivePositionTokenAccount(positionMint: PublicKey, payer: PublicKey): PublicKey {
  return spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);
}

export async function getMultiplePositionAccounts(
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
    return getPositionAccount(positionPdas, pairAddress, lbProgram);
  }
}

export async function getPositionAccount(
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
