import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { utils } from '@coral-xyz/anchor';

/**
 * Reward Hook account utilities
 */
export class Hooks {
  /**
   * Derive hook PDA address
   */
  public static deriveHookAddress(hooksConfig: PublicKey, pairAddress: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('hook')), hooksConfig.toBuffer(), pairAddress.toBuffer()],
      programId
    )[0];
  }

  /**
   * Ensure hook token account exists for a specific token
   */
  public static async ensureHookTokenAccount(
    hook: PublicKey,
    tokenMint: PublicKey,
    tokenProgram: PublicKey,
    payer: PublicKey,
    connection: Connection,
    transaction: Transaction
  ): Promise<PublicKey> {
    const associatedHookToken = spl.getAssociatedTokenAddressSync(tokenMint, hook, true, tokenProgram);

    const info = await connection.getAccountInfo(associatedHookToken);
    if (!info) {
      transaction.add(
        spl.createAssociatedTokenAccountInstruction(payer, associatedHookToken, hook, tokenMint, tokenProgram)
      );
    }

    return associatedHookToken;
  }
}
