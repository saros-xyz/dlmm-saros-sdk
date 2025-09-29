import { PublicKey, Transaction } from '@solana/web3.js';
import { utils } from '@coral-xyz/anchor';
import { BinArrays } from './bin-arrays';

/**
 * Pair utilities for DLMM pairs
 */
export class Pairs {
  /**
   * Derive pair PDA address
   */
  public static derivePairAddress(
    lbConfig: PublicKey,
    tokenXMint: PublicKey,
    tokenYMint: PublicKey,
    binStep: number,
    programId: PublicKey
  ): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('pair')),
        lbConfig.toBuffer(),
        tokenXMint.toBuffer(),
        tokenYMint.toBuffer(),
        new Uint8Array([binStep]),
      ],
      programId
    )[0];
  }

  /**
   * Derive bin step config PDA
   */
  public static deriveBinStepConfig(lbConfig: PublicKey, binStep: number, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('bin_step_config')), lbConfig.toBuffer(), new Uint8Array([binStep])],
      programId
    )[0];
  }

  /**
   * Derive quote asset badge PDA
   */
  public static deriveQuoteAssetBadge(lbConfig: PublicKey, tokenYMint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('quote_asset_badge')), lbConfig.toBuffer(), tokenYMint.toBuffer()],
      programId
    )[0];
  }

  /**
   * Get all pair creation PDAs in one call
   */
  public static getPairCreationAddresses(
    lbConfig: PublicKey,
    tokenXMint: PublicKey,
    tokenYMint: PublicKey,
    binStep: number,
    activeBinId: number,
    programId: PublicKey
  ): {
    pair: PublicKey;
    binStepConfig: PublicKey;
    quoteAssetBadge: PublicKey;
    binArrayLower: PublicKey;
    binArrayUpper: PublicKey;
    binArrayIndex: number;
  } {
    const pair = this.derivePairAddress(lbConfig, tokenXMint, tokenYMint, binStep, programId);
    const binStepConfig = this.deriveBinStepConfig(lbConfig, binStep, programId);
    const quoteAssetBadge = this.deriveQuoteAssetBadge(lbConfig, tokenYMint, programId);

    const binArrayIndex = BinArrays.calculateBinArrayIndex(activeBinId);
    const { binArrayLower, binArrayUpper } = BinArrays.getBinArrayAddresses(binArrayIndex, pair, programId);

    return {
      pair,
      binStepConfig,
      quoteAssetBadge,
      binArrayLower,
      binArrayUpper,
      binArrayIndex,
    };
  }

  /**
   * Initialize pair instruction with required bin arrays
   */
  public static async createPairWithBinArrays(
    lbConfig: PublicKey,
    tokenXMint: PublicKey,
    tokenYMint: PublicKey,
    binStep: number,
    activeBinId: number,
    payer: PublicKey,
    transaction: Transaction,
    connection: any,
    lbProgram: any
  ): Promise<{
    pair: PublicKey;
    binArrayLower: PublicKey;
    binArrayUpper: PublicKey;
    binArrayIndex: number;
  }> {
    const addresses = this.getPairCreationAddresses(
      lbConfig,
      tokenXMint,
      tokenYMint,
      binStep,
      activeBinId,
      lbProgram.programId
    );

    // Initialize pair instruction
    const initializePairIx = await lbProgram.methods
      .initializePair(activeBinId)
      .accountsPartial({
        liquidityBookConfig: lbConfig,
        binStepConfig: addresses.binStepConfig,
        quoteAssetBadge: addresses.quoteAssetBadge,
        pair: addresses.pair,
        tokenMintX: tokenXMint,
        tokenMintY: tokenYMint,
        user: payer,
      })
      .instruction();

    transaction.add(initializePairIx);

    // Initialize bin arrays
    await BinArrays.batchInitializeBinArrays(
      [addresses.binArrayIndex, addresses.binArrayIndex + 1],
      addresses.pair,
      payer,
      transaction,
      connection,
      lbProgram
    );

    return {
      pair: addresses.pair,
      binArrayLower: addresses.binArrayLower,
      binArrayUpper: addresses.binArrayUpper,
      binArrayIndex: addresses.binArrayIndex,
    };
  }

  /**
   * Find pairs by token mint addresses (for search functionality)
   */
  public static async findPairsByTokens(
    mintAddress: PublicKey,
    connection: any,
    programId: PublicKey
  ): Promise<string[]> {
    const accounts = await Promise.all([
      // Search as tokenX
      connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 43, bytes: mintAddress.toBase58() } }],
      }),
      // Search as tokenY
      connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 75, bytes: mintAddress.toBase58() } }],
      }),
    ]);

    return [...accounts[0], ...accounts[1]].map((acc) => acc.pubkey.toString());
  }
}
