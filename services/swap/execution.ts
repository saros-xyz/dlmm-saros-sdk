import { BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {
  BIN_ARRAY_SIZE,
  WRAP_SOL_PUBKEY,
} from "../../constants";
import { SwapParams, DLMMPairAccount } from "../../types";
import { addSolTransferInstructions, addCloseAccountInstruction } from "../../utils/transaction";

export class SwapExecutor {
  constructor(
    private lbProgram: any,
    private hooksProgram: any,
    private connection: any,
    private getTokenProgram: (address: PublicKey) => Promise<PublicKey>
  ) {}

  public async executeSwap(params: SwapParams): Promise<Transaction> {
    const {
      tokenMintX,
      tokenMintY,
      amount,
      otherAmountOffset,
      swapForY,
      isExactInput,
      pair,
      hook,
      payer,
    } = params;

    const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
    if (!pairInfo) throw new Error("Pair not found");

    const currentBinArrayIndex = Math.floor(pairInfo.activeId / BIN_ARRAY_SIZE);

    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(
        async (idx) => this.getBinArrayAddress({
          binArrayIndex: idx,
          pair,
        })
      )
    );

    const binArrayAccountsInfo = await this.connection.getMultipleAccountsInfo(
      binArrayAddresses
    );

    const validIndexes = surroundingIndexes.filter(
      (_, i) => binArrayAccountsInfo[i]
    );

    if (validIndexes.length < 2) {
      throw new Error("No valid bin arrays found for the pair");
    }

    let binArrayLowerIndex: number;
    let binArrayUpperIndex: number;
    if (validIndexes.length === 2) {
      [binArrayLowerIndex, binArrayUpperIndex] = validIndexes;
    } else {
      const activeOffset = pairInfo.activeId % BIN_ARRAY_SIZE;
      const [first, second, third] = validIndexes;
      [binArrayLowerIndex, binArrayUpperIndex] =
        activeOffset < BIN_ARRAY_SIZE / 2 ? [first, second] : [second, third];
    }

    const binArrayLower = this.getBinArrayAddress({
      pair,
      binArrayIndex: binArrayLowerIndex,
    });

    const binArrayUpper = this.getBinArrayAddress({
      pair,
      binArrayIndex: binArrayUpperIndex,
    });

    const [tokenProgramX, tokenProgramY] = await Promise.all([
      this.getTokenProgram(tokenMintX),
      this.getTokenProgram(tokenMintY),
    ]);

    const latestBlockHash = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    const associatedPairVaultX = spl.getAssociatedTokenAddressSync(
      tokenMintX,
      pair,
      true,
      tokenProgramX
    );

    const associatedPairVaultY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      pair,
      true,
      tokenProgramY
    );

    const associatedUserVaultX = spl.getAssociatedTokenAddressSync(
      tokenMintX,
      payer,
      true,
      tokenProgramX
    );

    const associatedUserVaultY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      payer,
      true,
      tokenProgramY
    );

    // Create user vault accounts if they don't exist
    await this.createUserVaultAccountsIfNeeded(
      tx,
      payer,
      tokenMintX,
      tokenMintY,
      tokenProgramX,
      tokenProgramY,
      associatedUserVaultX,
      associatedUserVaultY
    );

    // Handle wrapped SOL transfers
    if (
      tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if (isNativeY && !swapForY || !isNativeY && swapForY) {
        addSolTransferInstructions(tx, payer, associatedUserVault, amount);
      }
    }

    // Add swap instruction
    const swapInstructions = await this.lbProgram.methods
      .swap(
        new BN(amount.toString()),
        new BN(otherAmountOffset.toString()),
        swapForY,
        isExactInput ? { exactInput: {} } : { exactOutput: {} }
      )
      .accountsPartial({
        pair: pair,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        tokenVaultX: associatedPairVaultX,
        tokenVaultY: associatedPairVaultY,
        userVaultX: associatedUserVaultX,
        userVaultY: associatedUserVaultY,
        tokenMintX: tokenMintX,
        tokenMintY: tokenMintY,
        tokenProgramX,
        tokenProgramY,
        user: payer,
        hook: hook || null,
        hooksProgram: this.hooksProgram.programId,
      })
      .remainingAccounts([
        { pubkey: pair, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    // Handle wrapped SOL account closing
    if (
      tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        addCloseAccountInstruction(tx, associatedUserVault, payer);
      }
    }

    return tx;
  }

  private getBinArrayAddress(params: { binArrayIndex: number; pair: PublicKey }): PublicKey {
    const { binArrayIndex, pair } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bin_array", "utf8"),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    return binArray;
  }

  private async createUserVaultAccountsIfNeeded(
    tx: Transaction,
    payer: PublicKey,
    tokenMintX: PublicKey,
    tokenMintY: PublicKey,
    tokenProgramX: PublicKey,
    tokenProgramY: PublicKey,
    associatedUserVaultX: PublicKey,
    associatedUserVaultY: PublicKey
  ): Promise<void> {
    const infoUserVaultX = await this.connection.getAccountInfo(associatedUserVaultX);
    if (!infoUserVaultX) {
      const userVaultXInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultX,
        payer,
        tokenMintX,
        tokenProgramX
      );
      tx.add(userVaultXInstructions);
    }

    const infoUserVaultY = await this.connection.getAccountInfo(associatedUserVaultY);
    if (!infoUserVaultY) {
      const userVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultY,
        payer,
        tokenMintY,
        tokenProgramY
      );
      tx.add(userVaultYInstructions);
    }
  }
}