import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { utils } from '@coral-xyz/anchor';

export interface HookAccountsResult {
  hook: PublicKey;
  hookTokenAccountY?: PublicKey;
  hookPosition?: PublicKey;
  hookBinArrayLower?: PublicKey;
  hookBinArrayUpper?: PublicKey;
}

/**
 * Hook account management utilities
 */
export class HookManager {
  /**
   * Derive hook PDA address
   */
  public static deriveHookAddress(
    hooksConfig: PublicKey,
    pairAddress: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('hook')),
        hooksConfig.toBuffer(),
        pairAddress.toBuffer(),
      ],
      programId
    )[0];
  }

  /**
   * Derive hook position PDA
   */
  public static deriveHookPosition(
    hook: PublicKey,
    position: PublicKey,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), position.toBuffer()],
      programId
    )[0];
  }

  /**
   * Get complete hook setup for liquidity operations
   */
  public static async getHookAccountsForLiquidity(
    hooksConfig: PublicKey,
    pairAddress: PublicKey,
    tokenMintY: PublicKey,
    tokenProgramY: PublicKey,
    position: PublicKey,
    binArrayIndex: number,
    payer: PublicKey,
    connection: Connection,
    hooksProgram: any,
    transaction?: Transaction
  ): Promise<HookAccountsResult> {
    const hook = this.deriveHookAddress(hooksConfig, pairAddress, hooksProgram.programId);
    const hookPosition = this.deriveHookPosition(hook, position, hooksProgram.programId);

    const hookTokenAccountY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      hook,
      true,
      tokenProgramY
    );

    const { BinArrayManager } = await import('./pair/bin-manager');
    const hookBinArrayLower = BinArrayManager.getHookBinArrayAddress(
      hook,
      hooksProgram.programId,
      binArrayIndex
    );
    const hookBinArrayUpper = BinArrayManager.getHookBinArrayAddress(
      hook,
      hooksProgram.programId,
      binArrayIndex + 1
    );
    if (transaction) {
      const hookTokenAccountInfo = await connection.getAccountInfo(hookTokenAccountY);

      if (!hookTokenAccountInfo) {
        transaction.add(
          spl.createAssociatedTokenAccountInstruction(
            payer,
            hookTokenAccountY,
            hook,
            tokenMintY,
            tokenProgramY
          )
        );
      }
    }

    return {
      hook,
      hookTokenAccountY,
      hookPosition,
      hookBinArrayLower,
      hookBinArrayUpper,
    };
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
    const associatedHookToken = spl.getAssociatedTokenAddressSync(
      tokenMint,
      hook,
      true,
      tokenProgram
    );

    const info = await connection.getAccountInfo(associatedHookToken);
    if (!info) {
      transaction.add(
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedHookToken,
          hook,
          tokenMint,
          tokenProgram
        )
      );
    }

    return associatedHookToken;
  }

  /**
   * Setup multiple hook accounts in batch
   */
  public static async batchSetupHookAccounts(
    hooks: Array<{
      hooksConfig: PublicKey;
      pairAddress: PublicKey;
      tokenMints: PublicKey[];
      tokenPrograms: PublicKey[];
    }>,
    payer: PublicKey,
    connection: Connection,
    hooksProgram: any,
    transaction: Transaction
  ): Promise<HookAccountsResult[]> {
    const results: HookAccountsResult[] = [];

    const hookData = hooks.map(({ hooksConfig, pairAddress, tokenMints, tokenPrograms }) => {
      const hook = this.deriveHookAddress(hooksConfig, pairAddress, hooksProgram.programId);
      const tokenAccounts = tokenMints.map((mint, i) =>
        spl.getAssociatedTokenAddressSync(mint, hook, true, tokenPrograms[i])
      );

      return { hook, tokenAccounts, tokenMints, tokenPrograms };
    });

    const allTokenAccounts = hookData.flatMap(h => h.tokenAccounts);
    const accountInfos = await connection.getMultipleAccountsInfo(allTokenAccounts);
    let accountIndex = 0;
    for (const { hook, tokenAccounts, tokenMints, tokenPrograms } of hookData) {
      for (let i = 0; i < tokenAccounts.length; i++) {
        if (!accountInfos[accountIndex]) {
          transaction.add(
            spl.createAssociatedTokenAccountInstruction(
              payer,
              tokenAccounts[i],
              hook,
              tokenMints[i],
              tokenPrograms[i]
            )
          );
        }
        accountIndex++;
      }

      results.push({
        hook,
        hookTokenAccountY: tokenAccounts[1], // Assuming Y is second token
      });
    }

    return results;
  }
}