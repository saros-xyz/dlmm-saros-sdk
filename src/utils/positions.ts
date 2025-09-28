import { Connection, PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { utils } from '@coral-xyz/anchor';
import { chunk } from 'lodash';
import { PositionAccount } from '../types';

export interface PositionAddresses {
  position: PublicKey;
  positionVault: PublicKey;
  positionMint: PublicKey;
}

/**
 * Position utilities for PDA derivation and user position discovery
 */
export class Positions {
  /**
   * Derive position PDA from position mint
   */
  public static derivePositionAddress(positionMint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      programId
    )[0];
  }

  /**
   * Get position vault (TOKEN_2022 associated token account)
   */
  public static derivePositionVault(positionMint: PublicKey, payer: PublicKey): PublicKey {
    return spl.getAssociatedTokenAddressSync(positionMint, payer, true, spl.TOKEN_2022_PROGRAM_ID);
  }

  /**
   * Get complete position addresses for operations
   */
  public static getPositionAddresses(
    positionMint: PublicKey,
    payer: PublicKey,
    programId: PublicKey
  ): PositionAddresses {
    return {
      position: this.derivePositionAddress(positionMint, programId),
      positionVault: this.derivePositionVault(positionMint, payer),
      positionMint,
    };
  }

  /**
   * Get multiple position addresses in batch
   */
  public static getBatchPositionAddresses(
    positionMints: PublicKey[],
    payer: PublicKey,
    programId: PublicKey
  ): PositionAddresses[] {
    return positionMints.map((mint) => this.getPositionAddresses(mint, payer, programId));
  }

  /**
   * Get all user positions for a specific pair using optimized token account discovery
   */
  public static async getUserPositions(
    payer: PublicKey,
    pairAddress: PublicKey,
    connection: Connection,
    lbProgram: any
  ): Promise<PositionAccount[]> {
    // Verify: Position mints are always TOKEN_2022?
    const token2022AccountsResp = await connection.getParsedTokenAccountsByOwner(payer, {
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });

    if (token2022AccountsResp.value.length === 0) {
      return [];
    }

    // Extract position mints from accounts with balance > 0
    const positionMints = token2022AccountsResp.value
      .filter((acc) => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

    if (positionMints.length === 0) {
      return [];
    }

    // Derive position PDAs using our existing method
    const positionPdas = positionMints.map((mint) =>
      this.derivePositionAddress(mint, lbProgram.programId)
    );

    const positions = await this.getPositionAccountsBatch(positionPdas, pairAddress, lbProgram);
    return positions.filter(Boolean).sort((a, b) => a.lowerBinId - b.lowerBinId);
  }

  /**
   * Get user position mints only (lighter operation when you just need the mints)
   */
  public static async getUserPositionMints(
    payer: PublicKey,
    connection: Connection
  ): Promise<PublicKey[]> {
    const token2022AccountsResp = await connection.getParsedTokenAccountsByOwner(payer, {
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });

    return token2022AccountsResp.value
      .filter((acc) => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));
  }

  /**
   * Batch fetch position accounts with fallback for individual fetching
   */
  private static async getPositionAccountsBatch(
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
      return this.getPositionAccountsIndividually(positionPdas, pairAddress, lbProgram);
    }
  }

  /**
   * Fallback to individual position account fetching
   */
  private static async getPositionAccountsIndividually(
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
