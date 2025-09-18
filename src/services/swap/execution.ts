import { BN } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { BIN_ARRAY_SIZE, WRAP_SOL_PUBKEY } from '../../constants';
import { SwapParams, DLMMPairAccount } from '../../types';
import { addSolTransferInstructions, addCloseAccountInstruction } from '../../utils/transaction';
import { getUserVaultInfo, getTokenProgram } from '../../utils/vaults';
import { PoolServiceError } from '../pools/errors';
import { BinArrayManager } from '../pools/bin-manager';

export class SwapExecutor {
  constructor(
    private lbProgram: any,
    private hooksProgram: any,
    private connection: any
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
    if (!pairInfo) throw PoolServiceError.PoolNotFound;

    const currentBinArrayIndex = BinArrayManager.calculateBinArrayIndex(pairInfo.activeId);

    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(async (idx) =>
        BinArrayManager.getBinArrayAddress(idx, pair, this.lbProgram.programId)
      )
    );

    const binArrayAccountsInfo = await this.connection.getMultipleAccountsInfo(binArrayAddresses);

    const validIndexes = surroundingIndexes.filter((_, i) => binArrayAccountsInfo[i]);

    if (validIndexes.length < 2) {
      throw new Error('No valid bin arrays found for the pair');
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

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      binArrayLowerIndex,
      pair,
      this.lbProgram.programId
    );

    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      binArrayUpperIndex,
      pair,
      this.lbProgram.programId
    );

    const [tokenProgramX, tokenProgramY] = await Promise.all([
      getTokenProgram(tokenMintX, this.connection),
      getTokenProgram(tokenMintY, this.connection),
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

    // Use the centralized getUserVaultInfo function to create user vault accounts if needed
    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: tokenMintX, payer, transaction: tx },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: tokenMintY, payer, transaction: tx },
      this.connection
    );

    // Handle wrapped SOL transfers
    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      if ((isNativeY && !swapForY) || (!isNativeY && swapForY)) {
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
    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        addCloseAccountInstruction(tx, associatedUserVault, payer);
      }
    }

    return tx;
  }
}
