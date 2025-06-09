import {
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { ILiquidityBookConfig } from "../types";
import {
  BIN_ARRAY_INDEX,
  BIN_ARRAY_SIZE,
  WRAP_SOL_ADDRESS,
} from "../constants/config";
import { BN, utils } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { LiquidityBookAbstract } from "../interface/liquidityBookAbstract";
import { getProgram } from "./getProgram";
import { Buffer } from "buffer";
import {
  GetBinArrayParams,
  GetTokenOutputParams,
  GetTokenOutputResponse,
  SwapParams,
} from "../types/services";
import { LBSwapService } from "./swap";

export class LiquidityBookServices extends LiquidityBookAbstract {
  bufferGas?: number;
  constructor(config: ILiquidityBookConfig) {
    super(config);
  }

  get lbConfig() {
    return new PublicKey("BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8");
  }

  get hooksConfig() {
    return new PublicKey("DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF");
  }

  public async getPairAccount(pair: PublicKey) {
    //@ts-expect-error abc
    return await this.lbProgram.account.pair.fetch(pair);
  }

  getBinArray(params: GetBinArrayParams) {
    const { binArrayIndex, pair } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    return binArray;
  }

  public async swap(params: SwapParams): Promise<Transaction> {
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

    const pairInfo = await this.getPairAccount(pair);
    if (!pairInfo) throw new Error("Pair not found");

    let binArrayIndex = pairInfo.activeId / BIN_ARRAY_SIZE;
    if (pairInfo.activeId % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
      binArrayIndex -= 1;
    }

    const binArrayLower = this.getBinArray({
      binArrayIndex,
      pair,
    });
    const binArrayUpper = this.getBinArray({
      binArrayIndex: binArrayIndex + 1,
      pair,
    });

    const [tokenProgramX, tokenProgramY] = await Promise.all([
      getProgram(tokenMintX, this.connection),
      getProgram(tokenMintY, this.connection),
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

    const infoUserVaultX = await this.connection.getAccountInfo(
      associatedUserVaultX
    );

    if (!infoUserVaultX) {
      const userVaultXInstructions =
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedUserVaultX,
          payer,
          tokenMintX,
          tokenProgramX
        );

      tx.add(userVaultXInstructions);
    }

    const infoUserVaultY = await this.connection.getAccountInfo(
      associatedUserVaultY
    );

    if (!infoUserVaultY) {
      const userVaultYInstructions =
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedUserVaultY,
          payer,
          tokenMintY,
          tokenProgramY
        );

      tx.add(userVaultYInstructions);
    }

    const hookBinArrayLower = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        hook.toBuffer(),
        new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, "le", 4),
      ],
      this.hooksProgram.programId
    )[0];

    const hookBinArrayUpper = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        hook.toBuffer(),
        new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, "le", 4),
      ],
      this.hooksProgram.programId
    )[0];

    if (
      tokenMintY.toString() === WRAP_SOL_ADDRESS ||
      tokenMintX.toString() === WRAP_SOL_ADDRESS
    ) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY
        ? associatedUserVaultY
        : associatedUserVaultX;

      if (isNativeY && !swapForY) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: amount,
          })
        );
        tx.add(spl.createSyncNativeInstruction(associatedUserVault));
      }

      if (!isNativeY && swapForY) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: amount,
          })
        );
        tx.add(spl.createSyncNativeInstruction(associatedUserVault));
      }
    }

    const swapInstructions = await this.lbProgram.methods
      .swap(
        new BN(amount),
        new BN(otherAmountOffset),
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
      })
      .remainingAccounts([
        { pubkey: pair, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
        { pubkey: hookBinArrayLower, isWritable: true, isSigner: false },
        { pubkey: hookBinArrayUpper, isWritable: true, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    if (
      tokenMintY.toString() === WRAP_SOL_ADDRESS ||
      tokenMintX.toString() === WRAP_SOL_ADDRESS
    ) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY
        ? associatedUserVaultY
        : associatedUserVaultX;
      if ((isNativeY && swapForY) || (!isNativeY && !swapForY)) {
        tx.add(
          spl.createCloseAccountInstruction(associatedUserVault, payer, payer)
        );
      }
    }

    return tx;
  }

  public async getQuote(
    params: GetTokenOutputParams
  ): Promise<GetTokenOutputResponse> {
    const data = await LBSwapService.fromLbConfig(
      this.lbProgram,
      this.connection
    ).calculateInOutAmount(params);
    return data;
  }
}
