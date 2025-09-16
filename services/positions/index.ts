import { BN, utils } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import cloneDeep from "lodash/cloneDeep";
import { chunk } from "lodash";
import { LiquidityBookAbstract } from "../base/abstract";
import { LiquidityHelper } from "./liquidity";
import {
  BIN_ARRAY_INDEX,
  BIN_ARRAY_SIZE,
  MAX_BASIS_POINTS_BIGINT,
  WRAP_SOL_PUBKEY,
} from "../../constants";
import {
  AddLiquidityIntoPositionParams,
  BinReserveInfo,
  CreatePositionParams,
  GetBinsReserveParams,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
  UserPositionsParams,
  BinArray,
  PositionAccount,
  PositionInfo,
  DLMMPairAccount,
  ILiquidityBookConfig,
} from "../../types";
import { addComputeBudgetInstructions, addSolTransferInstructions, addCloseAccountInstruction } from "../../utils/transaction";
import { getGasPrice, getComputeUnitPrice } from "./gas";
import { getUserVaultInfo, getPairVaultInfo } from "../../utils/vaults";

export class PositionService extends LiquidityBookAbstract {
  bufferGas?: number;

  constructor(config: ILiquidityBookConfig) {
    super(config);
  }

  public async getPositionAccount(position: PublicKey): Promise<PositionAccount> {
    //@ts-ignore
    return await this.lbProgram.account.position.fetch(position);
  }

  public async getBinArrayInfo(params: {
    binArrayIndex: number;
    pair: PublicKey;
    payer: PublicKey;
  }): Promise<BinArray> {
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

    return { bins: result, index: resultIndex };
  }

  private async getBinArray(params: {
    binArrayIndex: number;
    pair: PublicKey;
    payer?: PublicKey;
    transaction?: Transaction;
  }): Promise<PublicKey> {
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

  public async getBinsReserveInformation(
    params: GetBinsReserveParams
  ): Promise<BinReserveInfo[]> {
    const { position, pair, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = Math.floor(firstBinId / BIN_ARRAY_SIZE);

    const { bins, index } = await this.getBinArrayInfo({
      binArrayIndex,
      pair,
      payer,
    });

    const firstBinIndex = index * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    const reserveXY = binIds.map((binId: number, index: number) => {
      const liquidityShare = positionInfo.liquidityShares[index];
      const activeBin = bins[binId];

      if (activeBin) {
        const totalReserveX = activeBin.reserveX;
        const totalReserveY = activeBin.reserveY;
        const totalSupply = activeBin.totalSupply;
        const liquidityShareBigInt = BigInt(liquidityShare.toString());

        const reserveX =
          totalReserveX > 0n
            ? (liquidityShareBigInt * totalReserveX) / totalSupply
            : 0n;

        const reserveY =
          totalReserveY > 0n
            ? (liquidityShareBigInt * totalReserveY) / totalSupply
            : 0n;

        return {
          reserveX,
          reserveY,
          totalSupply,
          binId: firstBinId + index,
          binPosition: binId,
          liquidityShare: liquidityShareBigInt,
        };
      }

      return {
        reserveX: 0n,
        reserveY: 0n,
        totalSupply: 0n,
        binId: firstBinId + index,
        binPosition: binId,
        liquidityShare: BigInt(liquidityShare.toString()),
      };
    });

    return reserveXY;
  }

  async createPosition(params: CreatePositionParams) {
    const {
      payer,
      relativeBinIdLeft,
      relativeBinIdRight,
      pair,
      positionMint,
      transaction,
    } = params;

    //@ts-ignore
    const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);
    const activeBinId = pairInfo.activeId;

    const lowerBinId = activeBinId + relativeBinIdLeft;
    const upperBinId = activeBinId + relativeBinIdRight;

    const binArrayIndexLower = Math.floor(lowerBinId / BIN_ARRAY_SIZE);
    const binArrayIndexUpper = Math.floor(upperBinId / BIN_ARRAY_SIZE);

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
      binArrayIndex: binArrayIndexLower,
      pair,
      payer,
    });

    if (binArrayIndexLower !== binArrayIndexUpper) {
      await this.getBinArray({
        binArrayIndex: binArrayIndexUpper,
        pair,
        payer,
      });
    }

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

    //@ts-ignore
    const pairInfo: DLMMPairAccount = await this.lbProgram.account.pair.fetch(pair);

    const tokenProgramX = await this.getTokenProgram(pairInfo.tokenMintX);
    const tokenProgramY = await this.getTokenProgram(pairInfo.tokenMintY);

    const associatedPairVaultX = await getPairVaultInfo(
      {
        tokenAddress: pairInfo.tokenMintX,
        pair,
      },
      this.connection
    );

    const associatedPairVaultY = await getPairVaultInfo(
      {
        tokenAddress: pairInfo.tokenMintY,
        pair,
      },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      {
        tokenAddress: pairInfo.tokenMintX,
        payer,
      },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      {
        tokenAddress: pairInfo.tokenMintY,
        payer,
      },
      this.connection
    );

    if (
      pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      pairInfo.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY);

      const totalAmount = isNativeY ? amountY : amountX;
      const totalLiquid = liquidityDistribution.reduce((prev, curr) => {
        const currAmount = isNativeY ? curr.distributionY : curr.distributionX;
        return prev + currAmount;
      }, 0);

      if (totalLiquid) {
        const amount = Number(
          (BigInt(totalLiquid) * totalAmount) / MAX_BASIS_POINTS_BIGINT
        );

        const associatedUserVault = isNativeY
          ? associatedUserVaultY
          : associatedUserVaultX;

        addSolTransferInstructions(
          transaction,
          payer,
          associatedUserVault,
          amount
        );
      }
    }

    const unitSPrice = await getGasPrice(this.connection).catch(
      () => undefined
    );

    const unitPrice = getComputeUnitPrice(unitSPrice, this.bufferGas);

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
      .increasePosition(
        new BN(amountX.toString()),
        new BN(amountY.toString()),
        liquidityDistribution
      )
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

    addComputeBudgetInstructions(transaction, unitPrice);

    transaction.add(addLiquidityInstructions);
  }

  public async removeMultipleLiquidity(
    params: RemoveMultipleLiquidityParams
  ): Promise<RemoveMultipleLiquidityResponse> {
    const {
      maxPositionList,
      payer,
      type,
      pair,
      tokenMintX,
      tokenMintY,
    } = params;

    const tokenProgramX = await this.getTokenProgram(tokenMintX);
    const tokenProgramY = await this.getTokenProgram(tokenMintY);

    const txCreateAccount = new Transaction();

    const associatedPairVaultX = await getPairVaultInfo(
      {
        tokenAddress: tokenMintX,
        pair,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedPairVaultY = await getPairVaultInfo(
      {
        tokenAddress: tokenMintY,
        pair,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      {
        tokenAddress: tokenMintX,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      {
        tokenAddress: tokenMintY,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("hook")),
        this.hooksConfig.toBuffer(),
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
      const hookTokenYInstructions = spl.createAssociatedTokenAccountInstruction(
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

    const unitPrice = getComputeUnitPrice(unitSPrice, this.bufferGas);

    const positionClosed: Record<string, string>[] = [];
    const txs = await Promise.all(
      maxPositionList.map(async ({ position, start, end, positionMint }) => {
        const binArrayIndex = Math.floor(start / BIN_ARRAY_SIZE);

        const { index } = await this.getBinArrayInfo({
          binArrayIndex,
          pair,
          payer,
        });

        const binArrayLower = await this.getBinArray({
          binArrayIndex: index,
          pair,
          payer,
        });

        const binArrayUpper = await this.getBinArray({
          binArrayIndex: index + 1,
          pair,
          payer,
        });

        const tx = new Transaction();
        addComputeBudgetInstructions(tx, unitPrice);

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

        const removedShares = LiquidityHelper.calculateRemovedShares(
          reserveXY,
          type,
          start,
          end
        );

        const availableShares = LiquidityHelper.getAvailableShares(
          reserveXY,
          type
        );

        const isClosePosition = LiquidityHelper.shouldClosePosition(
          type,
          start,
          end,
          availableShares
        );

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
      tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);

      const associatedUserVault = isNativeY
        ? associatedUserVaultY
        : associatedUserVaultX;

      addCloseAccountInstruction(txCloseAccount, associatedUserVault, payer);
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

  public async getUserPositions({ payer, pair }: UserPositionsParams): Promise<PositionInfo[]> {
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
        return amount && amount > 0;
      })
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

     const arrPositionPda = positionMints.map((mint) => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(utils.bytes.utf8.encode("position")), mint.toBuffer()],
        this.lbProgram.programId
      );
      return positionPda;
    });

    let positions = [];
    try {
      const arrPositionPdaChunked: PublicKey[][] = chunk(arrPositionPda, 10);
      const results: any[] = [];
      for (const item of arrPositionPdaChunked) {
        const accountsInfo = await connection.getMultipleAccountsInfo(item);
        results.push(...accountsInfo);
      }
      if (results.length !== arrPositionPda.length) {
        throw new Error("Invalid account info");
      }
      positions = await Promise.all(
        arrPositionPda.map(async (positionPda, idx) => {
          const accountInfo = results[idx];
          if (!accountInfo) return null;
          try {
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
    } catch {
      positions = await Promise.all(
        arrPositionPda.map(async (positionPda) => {
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
    }

    return positions
      .filter(Boolean)
      .sort((a, b) => a.lowerBinId - b.lowerBinId)
      .map((item) => ({
        liquidityShares: item.liquidityShares,
        lowerBinId: item.lowerBinId,
        upperBinId: item.upperBinId,
        positionMint: item.positionMint,
        position: item.position,
      } as PositionInfo));

  }
}