import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
} from "@solana/web3.js";
import { ILiquidityBookConfig, MODE, PoolMetadata } from "../types";
import {
  BIN_ARRAY_INDEX,
  BIN_ARRAY_SIZE,
  CCU_LIMIT,
  FIXED_LENGTH,
  MAX_BASIS_POINTS,
  PRECISION,
  SCALE_OFFSET,
  UNIT_PRICE_DEFAULT,
  WRAP_SOL_ADDRESS,
} from "../constants/config";
import { BN, utils } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { LiquidityBookAbstract } from "../interface/liquidityBookAbstract";
import { getProgram } from "./getProgram";
import { Buffer } from "buffer";
import cloneDeep from "lodash/cloneDeep";
import {
  AddLiquidityIntoPositionParams,
  CreatePairWithConfigParams,
  CreatePositionParams,
  GetBinArrayParams,
  GetBinsArrayInfoParams,
  GetBinsReserveParams,
  GetBinsReserveResponse,
  GetTokenOutputParams,
  GetTokenOutputResponse,
  GetUserVaultInfoParams,
  Pair,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
  ReserveParams,
  SwapParams,
  UserPositionsParams,
} from "../types/services";
import { LBSwapService } from "./swap";
import bigDecimal from "js-big-decimal";
import { getIdFromPrice, getPriceFromId } from "../utils/price";
import { mulDiv, mulShr, shlDiv } from "../utils/math";
import LiquidityBookIDL from "../constants/idl/liquidity_book.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getGasPrice } from "../utils";

export class LiquidityBookServices extends LiquidityBookAbstract {
  bufferGas?: number;
  constructor(config: ILiquidityBookConfig) {
    super(config);
  }

  get lbConfig() {
    if (this.mode === MODE.DEVNET) {
      return new PublicKey("DK6EoxvbMxJTkgcTAYfUnKyDZUTKb6wwPUFfpWsgeiR9");
    }
    return new PublicKey("BqPmjcPbAwE7mH23BY8q8VUEN4LSjhLUv41W87GsXVn8");
  }

  get hooksConfig() {
    if (this.mode === MODE.DEVNET) {
      return new PublicKey("2uAiHvYkmmvQkNh5tYtdR9sAUDwmbL7PjZcwAEYDqyES");
    }
    return new PublicKey("DgW5ARD9sU3W6SJqtyJSH3QPivxWt7EMvjER9hfFKWXF");
  }

  public async getPairAccount(pair: PublicKey) {
    //@ts-ignore
    return await this.lbProgram.account.pair.fetch(pair);
  }

  public async getPositionAccount(position: PublicKey) {
    //@ts-ignore
    return await this.lbProgram.account.position.fetch(position);
  }

  async getBinArray(params: GetBinArrayParams) {
    const { binArrayIndex, pair, payer, transaction } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    if (transaction && payer) {
      const binArrayInfo = await this.connection.getAccountInfo(binArray);

      if (!binArrayInfo) {
        const initializebinArrayConfigTx = await this.lbProgram.methods
          .initializeBinArray(binArrayIndex)
          .accountsPartial({ pair: pair, binArray: binArray, user: payer })
          .instruction();
        transaction.add(initializebinArrayConfigTx);
      }
    }

    return binArray;
  }

  public async getBinArrayInfo(params: GetBinsArrayInfoParams) {
    const { binArrayIndex, pair, payer } = params;
    let resultIndex = binArrayIndex;
    let result = [];

    const binArray = await this.getBinArray({
      binArrayIndex,
      pair,
      payer,
    });
    //@ts-ignore
    const { bins } = await this.lbProgram.account.binArray.fetch(binArray);
    try {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex + 1,
        pair,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);

      result = [...bins, ...res.bins];
    } catch {
      const binArrayOther = await this.getBinArray({
        binArrayIndex: binArrayIndex - 1,
        pair,
        payer,
      });
      //@ts-ignore
      const res = await this.lbProgram.account.binArray.fetch(binArrayOther);
      result = [...res.bins, ...bins];
      resultIndex -= 1;
    }

    return { bins: result, resultIndex };
  }

  public async getBinsReserveInformation(
    params: GetBinsReserveParams
  ): Promise<GetBinsReserveResponse[]> {
    const { position, pair, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    const { bins, resultIndex } = await this.getBinArrayInfo({
      binArrayIndex,
      pair,
      payer,
    });

    const firstBinIndex = resultIndex * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    const reserveXY = binIds.map((binId: number, index: number) => {
      const liquidityShare = positionInfo.liquidityShares[index].toString();
      const activeBin = bins[binId];

      if (activeBin) {
        const totalReserveX = +BigInt(activeBin.reserveX).toString();

        const totalReserveY = +BigInt(activeBin.reserveY).toString();

        const totalSupply = +BigInt(activeBin.totalSupply).toString();

        const reserveX =
          Number(totalReserveX) > 0
            ? mulDiv(
                Number(liquidityShare),
                Number(totalReserveX),
                Number(totalSupply),
                "down"
              )
            : 0;

        const reserveY =
          Number(totalReserveY) > 0
            ? mulDiv(
                Number(liquidityShare),
                Number(totalReserveY),
                Number(totalSupply),
                "down"
              )
            : 0;

        return {
          reserveX: reserveX || 0,
          reserveY: reserveY || 0,
          totalSupply: +BigInt(activeBin.totalSupply).toString(),
          binId: firstBinId + index,
          binPosistion: binId,
          liquidityShare: positionInfo.liquidityShares[index],
        };
      }
      return {
        reserveX: 0,
        reserveY: 0,
        totalSupply: "0",
        binId: firstBinId + index,
        binPosistion: binId,
        liquidityShare: liquidityShare,
      };
    });

    return reserveXY;
  }

  public async createPairWithConfig(params: CreatePairWithConfigParams) {
    const { tokenBase, tokenQuote, binStep, ratePrice, payer } = params;

    const tokenX = new PublicKey(tokenBase.mintAddress);
    const tokenY = new PublicKey(tokenQuote.mintAddress);

    const id = getIdFromPrice(
      ratePrice || 1,
      binStep,
      tokenBase.decimal,
      tokenQuote.decimal
    );

    let binArrayIndex = id / BIN_ARRAY_SIZE;

    if (id % BIN_ARRAY_SIZE < BIN_ARRAY_SIZE / 2) {
      binArrayIndex -= 1;
    }

    const tx = new Transaction();

    const binStepConfig = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_step_config")),
        this.lbConfig!.toBuffer(),
        new Uint8Array([binStep]),
      ],
      this.lbProgram.programId
    )[0];

    const quoteAssetBadge = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("quote_asset_badge")),
        this.lbConfig!.toBuffer(),
        tokenY.toBuffer(),
      ],
      this.lbProgram.programId
    )[0];

    const pair = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("pair")),
        this.lbConfig!.toBuffer(),
        tokenX.toBuffer(),
        tokenY.toBuffer(),
        new Uint8Array([binStep]),
      ],
      this.lbProgram.programId
    )[0];

    const initializePairConfigTx = await this.lbProgram.methods
      .initializePair(id)
      .accountsPartial({
        liquidityBookConfig: this.lbConfig!,
        binStepConfig: binStepConfig,
        quoteAssetBadge: quoteAssetBadge,
        pair: pair,
        tokenMintX: tokenX,
        tokenMintY: tokenY,
        user: payer,
      })
      .instruction();

    tx.add(initializePairConfigTx);

    const binArrayLower = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    const binArrayUpper = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new BN(Number(binArrayIndex) + 1).toArrayLike(Buffer, "le", 4),
      ],
      this.lbProgram.programId
    )[0];

    const initializeBinArrayLowerConfigTx = await this.lbProgram.methods
      .initializeBinArray(binArrayIndex)
      .accountsPartial({ pair: pair, binArray: binArrayLower, user: payer })
      .instruction();

    tx.add(initializeBinArrayLowerConfigTx);

    const initializeBinArrayUpperConfigTx = await this.lbProgram.methods
      .initializeBinArray(new BN(binArrayIndex + 1))
      .accountsPartial({ pair: pair, binArray: binArrayUpper, user: payer })
      .instruction();

    tx.add(initializeBinArrayUpperConfigTx);

    return {
      tx,
      pair: pair.toString(),
      binArrayLower: binArrayLower.toString(),
      binArrayUpper: binArrayUpper.toString(),
      hooksConfig: this.hooksConfig.toString(),
      activeBin: Number(id),
    };
  }

  async createPosition(params: CreatePositionParams) {
    const {
      payer,
      relativeBinIdLeft,
      relativeBinIdRight,
      pair,
      binArrayIndex,
      positionMint,
      transaction,
    } = params;

    const position = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("position")),
        positionMint.toBuffer(),
      ],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );

    await this.getBinArray({
      binArrayIndex,
      pair,
      payer,
    });

    await this.getBinArray({
      binArrayIndex: binArrayIndex + 1,
      pair,
      payer,
    });

    const initializePositionTx = await this.lbProgram.methods
      .createPosition(new BN(relativeBinIdLeft), new BN(relativeBinIdRight))
      .accountsPartial({
        pair,
        position: position,
        positionMint: positionMint,
        positionTokenAccount: positionVault,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        user: payer,
      })
      .instruction();

    transaction.add(initializePositionTx);

    return { position: position.toString() };
  }

  async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    const {
      positionMint,
      payer,
      pair,
      binArrayLower,
      binArrayUpper,
      transaction,
      liquidityDistribution,
      amountX,
      amountY,
    } = params;

    const pairInfo = await this.getPairAccount(pair);

    const tokenProgramX = await getProgram(
      pairInfo.tokenMintX,
      this.connection
    );
    const tokenProgramY = await getProgram(
      pairInfo.tokenMintY,
      this.connection
    );

    const associatedPairVaultX = await this.getPairVaultInfo({
      tokenAddress: pairInfo.tokenMintX,
      pair,
    });

    const associatedPairVaultY = await this.getPairVaultInfo({
      tokenAddress: pairInfo.tokenMintY,
      pair,
    });

    const associatedUserVaultX = await this.getUserVaultInfo({
      tokenAddress: pairInfo.tokenMintX,
      payer,
    });

    const associatedUserVaultY = await this.getUserVaultInfo({
      tokenAddress: pairInfo.tokenMintY,
      payer,
    });

    if (
      pairInfo.tokenMintY.toString() === WRAP_SOL_ADDRESS ||
      pairInfo.tokenMintX.toString() === WRAP_SOL_ADDRESS
    ) {
      const isNativeY = pairInfo.tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const totalAmount = isNativeY ? amountY : amountX;
      const totalLiquid = liquidityDistribution.reduce((prev, curr) => {
        const currAmount = isNativeY ? curr.distributionY : curr.distributionX;
        return prev + currAmount;
      }, 0);

      if (totalLiquid) {
        const amount = (totalLiquid * totalAmount) / MAX_BASIS_POINTS;

        const associatedUserVault = isNativeY
          ? associatedUserVaultY
          : associatedUserVaultX;

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: associatedUserVault,
            lamports: amount,
          })
        );
        transaction.add(spl.createSyncNativeInstruction(associatedUserVault));
      }
    }

    const unitSPrice = await getGasPrice(this.connection).catch(
      () => undefined
    );

    const unitPrice = Math.max(
      Number(unitSPrice) ?? 0,
      UNIT_PRICE_DEFAULT * (this.bufferGas ?? 1)
    );

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("hook")),
        this.hooksConfig.toBuffer(),
        pair.toBuffer(),
      ],
      this.hooksProgram.programId
    )[0];

    const position = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("position")),
        positionMint.toBuffer(),
      ],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );

    const addLiquidityInstructions = await this.lbProgram.methods
      .increasePosition(new BN(amountX), new BN(amountY), liquidityDistribution)
      .accountsPartial({
        pair: pair,
        position: position,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        tokenVaultX: associatedPairVaultX,
        tokenVaultY: associatedPairVaultY,
        userVaultX: associatedUserVaultX,
        userVaultY: associatedUserVaultY,
        positionTokenAccount: positionVault,
        tokenMintX: pairInfo.tokenMintX,
        tokenMintY: pairInfo.tokenMintY,
        tokenProgramX,
        tokenProgramY,
        positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        hook: hook,
        hooksProgram: this.hooksProgram.programId,
        user: payer,
        positionMint,
      })
      .remainingAccounts([
        { pubkey: pair, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: CCU_LIMIT,
      })
    );
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: unitPrice,
      })
    );

    transaction.add(addLiquidityInstructions);
  }

  public async removeMultipleLiquidity(
    params: RemoveMultipleLiquidityParams
  ): Promise<RemoveMultipleLiquidityResponse> {
    const { maxPositionList, payer, type, pair, tokenMintX, tokenMintY } =
      params;

    const tokenProgramX = await getProgram(tokenMintX, this.connection);
    const tokenProgramY = await getProgram(tokenMintY, this.connection);

    const txCreateAccount = new Transaction();

    const associatedPairVaultX = await this.getPairVaultInfo({
      tokenAddress: tokenMintX,
      pair,
      payer,
      transaction: txCreateAccount,
    });

    const associatedPairVaultY = await this.getPairVaultInfo({
      tokenAddress: tokenMintY,
      pair,
      payer,
      transaction: txCreateAccount,
    });

    const associatedUserVaultX = await this.getUserVaultInfo({
      tokenAddress: tokenMintX,
      payer,
      transaction: txCreateAccount,
    });

    const associatedUserVaultY = await this.getUserVaultInfo({
      tokenAddress: tokenMintY,
      payer,
      transaction: txCreateAccount,
    });

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("hook")),
        this.hooksConfig!.toBuffer(),
        pair.toBuffer(),
      ],
      this.hooksProgram.programId
    )[0];

    const associatedHookTokenY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      hook,
      true,
      tokenProgramY
    );
    const infoHookTokenY = await this.connection.getAccountInfo(
      associatedHookTokenY
    );

    if (!infoHookTokenY) {
      const hookTokenYInstructions =
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedHookTokenY,
          hook,
          tokenMintY,
          tokenProgramY
        );

      txCreateAccount.add(hookTokenYInstructions);
    }

    const unitSPrice = await getGasPrice(this.connection).catch(
      () => undefined
    );

    const unitPrice = Math.max(
      Number(unitSPrice) ?? 0,
      UNIT_PRICE_DEFAULT * (this.bufferGas ?? 1)
    );

    const positionClosed: Record<string, string>[] = [];
    const txs = await Promise.all(
      maxPositionList.map(async ({ position, start, end, positionMint }) => {
        const binArrayIndex = Math.floor(start / BIN_ARRAY_SIZE);

        const { resultIndex } = await this.getBinArrayInfo({
          binArrayIndex,
          pair,
          payer,
        });

        const binArrayLower = await this.getBinArray({
          binArrayIndex: resultIndex,
          pair,
          payer,
        });

        const binArrayUpper = await this.getBinArray({
          binArrayIndex: resultIndex + 1,
          pair,
          payer,
        });

        const tx = new Transaction();
        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: CCU_LIMIT,
          })
        );
        tx.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: unitPrice,
          })
        );

        const positionVault = spl.getAssociatedTokenAddressSync(
          new PublicKey(positionMint),
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = cloneDeep(
          await this.getBinsReserveInformation({
            position: new PublicKey(position),
            pair,
            payer,
          })
        );

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

        const hookPosition = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode("position")),
            hook.toBuffer(),
            new PublicKey(position).toBuffer(),
          ],
          this.hooksProgram.programId
        )[0];

        let removedShares: BN[] = [];

        if (type === "removeBoth") {
          removedShares = reserveXY.map((reserve: ReserveParams) => {
            const binId = reserve.binId;
            if (binId >= Number(start) && binId <= Number(end)) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        if (type === "removeBaseToken") {
          removedShares = reserveXY.map((reserve: ReserveParams) => {
            if (reserve.reserveX && reserve.reserveY === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        if (type === "removeQuoteToken") {
          removedShares = reserveXY.map((reserve: ReserveParams) => {
            if (reserve.reserveY && reserve.reserveX === 0) {
              return reserve.liquidityShare;
            }

            return new BN(0);
          });
        }

        const availableShares = reserveXY.filter((item: ReserveParams) =>
          type === "removeBoth"
            ? !new BN(item.liquidityShare).eq(new BN(0))
            : type === "removeQuoteToken"
            ? !item.reserveX
            : !item.reserveY
        );

        const isClosePosition =
          (type === "removeBoth" &&
            end - start + 1 >= availableShares.length) ||
          (end - start + 1 === FIXED_LENGTH &&
            availableShares.length === FIXED_LENGTH);
        if (isClosePosition) {
          const instructions = await this.lbProgram.methods
            .closePosition()
            .accountsPartial({
              pair,
              position,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX,
              tokenMintY,
              tokenProgramX,
              tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          positionClosed.push({ position });
          tx.add(instructions);
        } else {
          const instructions = await this.lbProgram.methods
            .decreasePosition(removedShares)
            .accountsPartial({
              pair: pair,
              position,
              binArrayLower: binArrayLower,
              binArrayUpper: binArrayUpper,
              tokenVaultX: associatedPairVaultX,
              tokenVaultY: associatedPairVaultY,
              userVaultX: associatedUserVaultX,
              userVaultY: associatedUserVaultY,
              positionTokenAccount: positionVault,
              tokenMintX: tokenMintX,
              tokenMintY: tokenMintY,
              tokenProgramX,
              tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook: hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            ?.remainingAccounts([
              { pubkey: pair, isWritable: false, isSigner: false },
              { pubkey: binArrayLower, isWritable: false, isSigner: false },
              { pubkey: binArrayUpper, isWritable: false, isSigner: false },
              { pubkey: hookBinArrayLower, isWritable: true, isSigner: false },
              { pubkey: hookBinArrayUpper, isWritable: true, isSigner: false },
              { pubkey: hookPosition, isWritable: true, isSigner: false },
            ])
            .instruction();

          tx.add(instructions);
        }

        return tx;
      })
    );

    const txCloseAccount = new Transaction();

    if (
      tokenMintY.toString() === WRAP_SOL_ADDRESS ||
      tokenMintX.toString() === WRAP_SOL_ADDRESS
    ) {
      const isNativeY = tokenMintY.toString() === WRAP_SOL_ADDRESS;

      const associatedUserVault = isNativeY
        ? associatedUserVaultY
        : associatedUserVaultX;

      txCloseAccount.add(
        spl.createCloseAccountInstruction(associatedUserVault, payer, payer)
      );
    }

    return {
      txs,
      txCreateAccount: txCreateAccount.instructions.length
        ? txCreateAccount
        : undefined,
      txCloseAccount: txCloseAccount.instructions.length
        ? txCloseAccount
        : undefined,
      positionClosed,
    };
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

    const currentBinArrayIndex = Math.floor(pairInfo.activeId / BIN_ARRAY_SIZE);

    const surroundingIndexes = [
      currentBinArrayIndex - 1,
      currentBinArrayIndex,
      currentBinArrayIndex + 1,
    ];

    const binArrayAddresses = await Promise.all(
      surroundingIndexes.map(
        async (idx) =>
          await this.getBinArray({
            binArrayIndex: idx,
            pair,
            payer,
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

    const binArrayLower = await this.getBinArray({
      pair,
      binArrayIndex: binArrayLowerIndex,
      payer,
    });

    const binArrayUpper = await this.getBinArray({
      pair,
      binArrayIndex: binArrayUpperIndex,
      payer,
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
      const userVaultXInstructions = spl.createAssociatedTokenAccountInstruction(
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
      const userVaultYInstructions = spl.createAssociatedTokenAccountInstruction(
        payer,
        associatedUserVaultY,
        payer,
        tokenMintY,
        tokenProgramY
      );

      tx.add(userVaultYInstructions);
    }

    // const hookBinArrayLower = PublicKey.findProgramAddressSync(
    //   [
    //     Buffer.from(utils.bytes.utf8.encode("bin_array")),
    //     hook.toBuffer(),
    //     new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, "le", 4),
    //   ],
    //   this.hooksProgram.programId
    // )[0];

    // const hookBinArrayUpper = PublicKey.findProgramAddressSync(
    //   [
    //     Buffer.from(utils.bytes.utf8.encode("bin_array")),
    //     hook.toBuffer(),
    //     new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, "le", 4),
    //   ],
    //   this.hooksProgram.programId
    // )[0];

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
        hooksProgram: this.hooksProgram.programId
      })
      .remainingAccounts([
        { pubkey: pair, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
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
    try {
      const data = await LBSwapService.fromLbConfig(
        this.lbProgram,
        this.connection
      ).calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      const slippageFraction = params.slippage / 100;
      const slippageScaled = Math.round(slippageFraction * PRECISION);
      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;
      if (params.isExactInput) {
        minAmountOut =
          (amountOut * BigInt(PRECISION - slippageScaled)) / BigInt(PRECISION);
      } else {
        // max mount in should div for slippage
        maxAmountIn =
          (amountIn * BigInt(PRECISION)) / BigInt(PRECISION - slippageScaled);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee(
        params.pair,
        Number(amountIn.toString()),
        params.swapForY,
        params.tokenBaseDecimal,
        params.tokenQuoteDecimal
      );

      const priceImpact = new bigDecimal(amountOut)
        .subtract(new bigDecimal(maxAmountOut))
        .divide(new bigDecimal(maxAmountOut))
        .multiply(new bigDecimal(100))
        .getValue();

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: params.isExactInput ? maxAmountIn : minAmountOut,
        otherAmountOffset: params.isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: Number(priceImpact),
      };
    } catch (error) {
      throw error;
    }
  }

  public async getMaxAmountOutWithFee(
    pairAddress: PublicKey,
    amount: number,
    swapForY: boolean = false,
    decimalBase: number = 9,
    decimalQuote: number = 9
  ) {
    try {
      let amountIn = BigInt(amount);
      const pair = await this.getPairAccount(pairAddress);
      const activeId = pair?.activeId;
      const binStep = pair?.binStep;
      const swapService = LBSwapService.fromLbConfig(
        this.lbProgram,
        this.connection
      );
      const feePrice = swapService.getTotalFee(pair);
      const activePrice = getPriceFromId(binStep, activeId, 9, 9);
      const price = getPriceFromId(
        binStep,
        activeId,
        decimalBase,
        decimalQuote
      );

      const feeAmount = swapService.getFeeAmount(amountIn, feePrice);
      amountIn = BigInt(amountIn) - BigInt(feeAmount); // new BN(amountIn).subtract(new BN(feeAmount));
      const maxAmountOut = swapForY
        ? mulShr(Number(amountIn.toString()), activePrice, SCALE_OFFSET, "down")
        : shlDiv(
            Number(amountIn.toString()),
            activePrice,
            SCALE_OFFSET,
            "down"
          );

      return { maxAmountOut, price };
    } catch {}

    return { maxAmountOut: 0, price: 0 };
  }

  public getDexName() {
    return "Saros DLMM";
  }

  public getDexProgramId() {
    return this.lbProgram.programId;
  }

  public async fetchPoolAddresses() {
    const programId = this.getDexProgramId();
    const connection = this.connection;
    const pairAccount = LiquidityBookIDL.accounts.find(
      (acc) => acc.name === "Pair"
    );
    const pairAccountDiscriminator = pairAccount
      ? pairAccount.discriminator
      : undefined;

    if (!pairAccountDiscriminator) {
      throw new Error("Pair account not found");
    }

    const accounts = await connection.getProgramAccounts(
      new PublicKey(programId),
      {
        filters: [
          {
            memcmp: { offset: 0, bytes: bs58.encode(pairAccountDiscriminator) },
          },
        ],
      }
    );
    if (accounts.length === 0) {
      throw new Error("Pair not found");
    }
    const poolAdresses = accounts.reduce((addresses: string[], account) => {
      if (account.account.owner.toString() !== programId.toString()) {
        return addresses;
      }
      if (account.account.data.length < 8) {
        return addresses;
      }
      addresses.push(account.pubkey.toString());
      return addresses;
    }, []);

    return poolAdresses;
  }

  public async getUserPositions({ payer, pair }: UserPositionsParams) {
    const connection = this.connection;
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      payer,
      {
        programId: spl.TOKEN_2022_PROGRAM_ID,
      }
    );

    const positionMints = tokenAccounts.value
      .filter((acc) => {
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        // Only interested in NFTs or position tokens with amount > 0
        return amount && amount > 0;
      })
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

    const positions = await Promise.all(
      positionMints.map(async (mint) => {
        // Derive PDA for Position account
        const [positionPda] = await PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode("position")), mint.toBuffer()],
          this.lbProgram.programId
        );
        // Fetch and decode the Position account
        try {
          const accountInfo = await connection.getAccountInfo(positionPda);
          if (!accountInfo) return null;
          //@ts-ignore
          const position = await this.lbProgram.account.position.fetch(
            positionPda
          );
          if (position.pair.toString() !== pair.toString()) return null;
          return { ...position, position: positionPda.toString() };
        } catch {
          return null;
        }
      })
    );
    return positions.filter(Boolean);
  }

  public async quote(params: {
    amount: number;
    metadata: PoolMetadata;
    optional: {
      isExactInput: boolean;
      swapForY: boolean;
      slippage: number;
    };
  }) {
    const { amount, metadata, optional } = params;

    return await this.getQuote({
      amount: BigInt(amount),
      isExactInput: optional.isExactInput,
      pair: new PublicKey(metadata.poolAddress),
      slippage: optional.slippage,
      swapForY: optional.swapForY,
      tokenBase: new PublicKey(metadata.baseMint),
      tokenBaseDecimal: metadata.extra.tokenBaseDecimal,
      tokenQuote: new PublicKey(metadata.quoteMint),
      tokenQuoteDecimal: metadata.extra.tokenQuoteDecimal,
    });
  }

  public async fetchPoolMetadata(pair: string): Promise<PoolMetadata> {
    const connection = this.connection;
    //@ts-ignore
    const pairInfo: Pair = await this.lbProgram.account.pair.fetch(
      new PublicKey(pair)
    );
    if (!pairInfo) {
      throw new Error("Pair not found");
    }

    const basePairVault = await this.getPairVaultInfo({
      tokenAddress: new PublicKey(pairInfo.tokenMintX),
      pair: new PublicKey(pair),
    });
    const quotePairVault = await this.getPairVaultInfo({
      tokenAddress: new PublicKey(pairInfo.tokenMintY),
      pair: new PublicKey(pair),
    });

    const [baseReserve, quoteReserve] = await Promise.all([
      connection.getTokenAccountBalance(basePairVault).catch(() => ({
        value: {
          uiAmount: 0,
          amount: "0",
          decimals: 0,
          uiAmountString: "0",
        },
      })),
      connection.getTokenAccountBalance(quotePairVault).catch(() => ({
        value: {
          uiAmount: 0,
          amount: "0",
          decimals: 0,
          uiAmountString: "0",
        },
      })),
    ]);

    return {
      poolAddress: pair,
      baseMint: pairInfo.tokenMintX.toString(),
      baseReserve: baseReserve.value.amount,
      quoteMint: pairInfo.tokenMintY.toString(),
      quoteReserve: quoteReserve.value.amount,
      tradeFee:
        (pairInfo.staticFeeParameters.baseFactor * pairInfo.binStep) / 1e6,
      extra: {
        hook: pairInfo.hook?.toString(),
        tokenQuoteDecimal: baseReserve.value.decimals,
        tokenBaseDecimal: quoteReserve.value.decimals,
      },
    };
  }

  public async getPairVaultInfo(params: {
    tokenAddress: PublicKey;
    pair: PublicKey;
    payer?: PublicKey;
    transaction?: Transaction;
  }) {
    const { tokenAddress, pair, payer, transaction } = params;

    const tokenMint = new PublicKey(tokenAddress);
    const tokenProgram = await getProgram(tokenMint, this.connection);

    const associatedPairVault = spl.getAssociatedTokenAddressSync(
      tokenMint,
      pair,
      true,
      tokenProgram
    );

    if (transaction && payer) {
      const infoPairVault = await this.connection.getAccountInfo(
        associatedPairVault
      );

      if (!infoPairVault) {
        const pairVaultYInstructions =
          spl.createAssociatedTokenAccountInstruction(
            payer,
            associatedPairVault,
            pair,
            tokenMint,
            tokenProgram
          );
        transaction.add(pairVaultYInstructions);
      }
    }

    return associatedPairVault;
  }

  public async getUserVaultInfo(params: GetUserVaultInfoParams) {
    const { tokenAddress, payer, transaction } = params;
    const tokenProgram = await getProgram(tokenAddress, this.connection);
    const associatedUserVault = spl.getAssociatedTokenAddressSync(
      tokenAddress,
      payer,
      true,
      tokenProgram
    );

    if (transaction) {
      const infoUserVault = await this.connection.getAccountInfo(
        associatedUserVault
      );

      if (!infoUserVault) {
        const userVaultYInstructions =
          spl.createAssociatedTokenAccountInstruction(
            payer,
            associatedUserVault,
            payer,
            tokenAddress,
            tokenProgram
          );
        transaction.add(userVaultYInstructions);
      }
    }
    return associatedUserVault;
  }

  public async listenNewPoolAddress(
    postTxFunction: (address: string) => Promise<void>
  ) {
    const LB_PROGRAM_ID = this.getDexProgramId();
    this.connection.onLogs(
      LB_PROGRAM_ID,
      (logInfo) => {
        if (!logInfo.err) {
          const logs = logInfo.logs || [];
          for (const log of logs) {
            if (log.includes("Instruction: InitializePair")) {
              const signature = logInfo.signature;

              this.getPairAddressFromLogs(signature).then((address) => {
                postTxFunction(address);
              });
            }
          }
        }
      },
      "finalized"
    );
  }

  private async getPairAddressFromLogs(signature: string) {
    const parsedTransaction = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!parsedTransaction) {
      throw new Error("Transaction not found");
    }

    const compiledMessage = parsedTransaction.transaction.message;
    const message = TransactionMessage.decompile(compiledMessage);
    const instructions = message.instructions;
    const initializePairStruct = LiquidityBookIDL.instructions.find(
      (item) => item.name === "initialize_pair"
    )!;

    const initializePairDescrimator = Buffer.from(
      initializePairStruct!.discriminator
    );

    let pairAddress = "";

    for (const instruction of instructions) {
      const descimatorInstruction = instruction.data.subarray(0, 8);
      if (!descimatorInstruction.equals(initializePairDescrimator)) continue;
      //@ts-ignore
      const accounts = initializePairStruct.accounts.map((item, index) => {
        return {
          name: item.name,
          address: instruction.keys[index].pubkey.toString(),
        };
      });
      pairAddress =
        accounts.find(
          (item: { name: string; address: string }) => item.name === "pair"
        )?.address || "";
    }
    return pairAddress;
  }
}
