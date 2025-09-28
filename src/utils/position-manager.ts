import { PublicKey } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { utils } from '@coral-xyz/anchor';

export interface PositionAddresses {
  position: PublicKey;
  positionVault: PublicKey;
  positionMint: PublicKey;
}

/**
 * Position PDA and account management utilities
 */
export class PositionManager {
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
    return spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );
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
    return positionMints.map(mint => this.getPositionAddresses(mint, payer, programId));
  }
}