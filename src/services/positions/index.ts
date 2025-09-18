import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { chunk } from 'lodash';
import { SarosBaseService, SarosConfig } from '../base';
import { LiquidityManager } from './liquidity';
import {
  BIN_ARRAY_INDEX,
  BIN_ARRAY_SIZE,
  MAX_BASIS_POINTS_BIGINT,
  WRAP_SOL_PUBKEY,
} from '../../constants';
import {
  AddLiquidityToPositionParams,
  PositionBinReserve,
  CreatePositionParams,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
  GetUserPositionsParams,
  BinArray,
  PositionAccount,
  PositionInfo,
  DLMMPairAccount,
} from '../../types';
import {
  addSolTransferInstructions,
  addCloseAccountInstruction,
  addOptimalComputeBudget,
} from '../../utils/transaction';
import { getUserVaultInfo, getPairVaultInfo } from '../../utils/vaults';
import { BinArrayManager } from '../pools/bins';
import { createUniformDistribution } from './bin-distribution';

export class PositionService extends SarosBaseService {
  bufferGas?: number;

  constructor(config: SarosConfig) {
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
    const { binArrayIndex, pair } = params;

    try {
      const currentBinArray = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        pair,
        this.lbProgram.programId
      );
      //@ts-ignore
      const { bins: currentBins } = await this.lbProgram.account.binArray.fetch(currentBinArray);

      try {
        const nextBinArray = BinArrayManager.getBinArrayAddress(
          binArrayIndex + 1,
          pair,
          this.lbProgram.programId
        );
        //@ts-ignore
        const { bins: nextBins } = await this.lbProgram.account.binArray.fetch(nextBinArray);
        return { bins: [...currentBins, ...nextBins], index: binArrayIndex };
      } catch {
        try {
          const prevBinArray = BinArrayManager.getBinArrayAddress(
            binArrayIndex - 1,
            pair,
            this.lbProgram.programId
          );
          //@ts-ignore
          const { bins: prevBins } = await this.lbProgram.account.binArray.fetch(prevBinArray);
          return { bins: [...prevBins, ...currentBins], index: binArrayIndex - 1 };
        } catch {
          return { bins: currentBins, index: binArrayIndex };
        }
      }
    } catch (error) {
      throw new Error(`Failed to get bin array info for index ${binArrayIndex}: ${error}`);
    }
  }

  private async getBinsReserveInformation(params: {
    position: PublicKey;
    pair: PublicKey;
    payer: PublicKey;
  }): Promise<PositionBinReserve[]> {
    const { position, pair, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = BinArrayManager.calculateBinArrayIndex(firstBinId);

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
          totalReserveX > 0n ? (liquidityShareBigInt * totalReserveX) / totalSupply : 0n;

        const reserveY =
          totalReserveY > 0n ? (liquidityShareBigInt * totalReserveY) / totalSupply : 0n;

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

  async createPosition(params: CreatePositionParams, pairInfo: DLMMPairAccount) {
    const { payer, binRange, poolAddress, positionMint, transaction } = params;
    const [binIdLeft, binIdRight] = binRange;
    const activeBinId = pairInfo.activeId;
    const lowerBinId = activeBinId + binIdLeft;
    const upperBinId = activeBinId + binIdRight;

    const binArrayIndexLower = BinArrayManager.calculateBinArrayIndex(lowerBinId);
    const binArrayIndexUpper = BinArrayManager.calculateBinArrayIndex(upperBinId);

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
      this.lbProgram.programId
    )[0];

    const positionVault = spl.getAssociatedTokenAddressSync(
      positionMint,
      payer,
      true,
      spl.TOKEN_2022_PROGRAM_ID
    );
    await BinArrayManager.addInitializeBinArrayInstruction(
      binArrayIndexLower,
      poolAddress,
      payer,
      transaction,
      this.connection,
      this.lbProgram
    );

    if (binArrayIndexLower !== binArrayIndexUpper) {
      await BinArrayManager.addInitializeBinArrayInstruction(
        binArrayIndexUpper,
        poolAddress,
        payer,
        transaction,
        this.connection,
        this.lbProgram
      );
    }

    const initializePositionTx = await this.lbProgram.methods
      .createPosition(new BN(binIdLeft), new BN(binIdRight))
      .accountsPartial({
        pair: poolAddress,
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

  async addLiquidityToPosition(params: AddLiquidityToPositionParams, pairInfo: DLMMPairAccount) {
    const {
      positionMint,
      payer,
      poolAddress,
      transaction,
      baseAmount,
      quoteAmount,
      liquidityShape,
      binRange,
    } = params;

    const tokenProgramX = await this.getTokenProgram(pairInfo.tokenMintX);
    const tokenProgramY = await this.getTokenProgram(pairInfo.tokenMintY);

    const associatedPairVaultX = await getPairVaultInfo(
      {
        tokenMint: pairInfo.tokenMintX,
        pair: poolAddress,
      },
      this.connection
    );

    const associatedPairVaultY = await getPairVaultInfo(
      {
        tokenMint: pairInfo.tokenMintY,
        pair: poolAddress,
      },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      {
        tokenMint: pairInfo.tokenMintX,
        payer,
      },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      {
        tokenMint: pairInfo.tokenMintY,
        payer,
      },
      this.connection
    );

    // Generate distribution from shape
    const liquidityDistribution = createUniformDistribution({
      shape: liquidityShape,
      binRange: binRange,
    });

    // Calculate bin arrays internally
    const activeBinId = pairInfo.activeId;
    const lowerBinId = activeBinId + params.binRange[0];
    const upperBinId = activeBinId + params.binRange[1];

    const binArrayIndexLower = BinArrayManager.calculateBinArrayIndex(lowerBinId);
    const binArrayIndexUpper = BinArrayManager.calculateBinArrayIndex(upperBinId);

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      binArrayIndexLower,
      params.poolAddress,
      this.lbProgram.programId
    );
    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      binArrayIndexUpper,
      params.poolAddress,
      this.lbProgram.programId
    );

    if (
      pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      pairInfo.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY);

      const totalAmount = isNativeY ? quoteAmount : baseAmount;
      const totalLiquid = liquidityDistribution.reduce((prev, curr) => {
        const currAmount = isNativeY ? curr.distributionY : curr.distributionX;
        return prev + currAmount;
      }, 0);

      if (totalLiquid) {
        const amount = Number((BigInt(totalLiquid) * totalAmount) / MAX_BASIS_POINTS_BIGINT);

        const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

        addSolTransferInstructions(transaction, payer, associatedUserVault, amount);
      }
    }

    const hook = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('hook')),
        this.hooksConfig.toBuffer(),
        poolAddress.toBuffer(),
      ],
      this.hooksProgram.programId
    )[0];

    const position = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
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
        new BN(baseAmount.toString()),
        new BN(quoteAmount.toString()),
        liquidityDistribution
      )
      .accountsPartial({
        pair: poolAddress,
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
        { pubkey: poolAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    await addOptimalComputeBudget(transaction, this.connection, this.bufferGas);

    transaction.add(addLiquidityInstructions);
  }

  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const { positions, payer, type, poolAddress: pair, tokenMintX, tokenMintY } = params;

    const tokenProgramX = await this.getTokenProgram(tokenMintX);
    const tokenProgramY = await this.getTokenProgram(tokenMintY);

    const txCreateAccount = new Transaction();

    const associatedPairVaultX = await getPairVaultInfo(
      {
        tokenMint: tokenMintX,
        pair,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedPairVaultY = await getPairVaultInfo(
      {
        tokenMint: tokenMintY,
        pair,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      {
        tokenMint: tokenMintX,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const associatedUserVaultY = await getUserVaultInfo(
      {
        tokenMint: tokenMintY,
        payer,
        transaction: txCreateAccount,
      },
      this.connection
    );

    const hook = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('hook')), this.hooksConfig.toBuffer(), pair.toBuffer()],
      this.hooksProgram.programId
    )[0];

    const associatedHookTokenY = spl.getAssociatedTokenAddressSync(
      tokenMintY,
      hook,
      true,
      tokenProgramY
    );
    const infoHookTokenY = await this.connection.getAccountInfo(associatedHookTokenY);

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

    const positionClosed: Record<string, string>[] = [];
    const txs = await Promise.all(
      positions.map(async ({ position, start, end, positionMint }) => {
        const binArrayIndex = BinArrayManager.calculateBinArrayIndex(start);

        const { index } = await this.getBinArrayInfo({
          binArrayIndex,
          pair,
          payer,
        });

        const binArrayLower = BinArrayManager.getBinArrayAddress(
          index,
          pair,
          this.lbProgram.programId
        );

        const binArrayUpper = BinArrayManager.getBinArrayAddress(
          index + 1,
          pair,
          this.lbProgram.programId
        );

        const tx = new Transaction();
        await addOptimalComputeBudget(tx, this.connection, this.bufferGas);

        const positionVault = spl.getAssociatedTokenAddressSync(
          new PublicKey(positionMint),
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = await this.getBinsReserveInformation({
          position: new PublicKey(position),
          pair,
          payer,
        });

        const hookBinArrayLower = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode('bin_array')),
            hook.toBuffer(),
            new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, 'le', 4), // should this use index instead?
          ],
          this.hooksProgram.programId
        )[0];

        const hookBinArrayUpper = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode('bin_array')),
            hook.toBuffer(),
            new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, 'le', 4), // should this use index instead?
          ],
          this.hooksProgram.programId
        )[0];

        const hookPosition = PublicKey.findProgramAddressSync(
          [
            Buffer.from(utils.bytes.utf8.encode('position')),
            hook.toBuffer(),
            new PublicKey(position).toBuffer(),
          ],
          this.hooksProgram.programId
        )[0];

        const removedShares = LiquidityManager.calculateRemovedShares(reserveXY, type, start, end);
        const availableShares = LiquidityManager.getAvailableShares(reserveXY, type);
        const isClosePosition = LiquidityManager.shouldClosePosition(
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

    if (tokenMintY.equals(WRAP_SOL_PUBKEY) || tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = tokenMintY.equals(WRAP_SOL_PUBKEY);

      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;

      addCloseAccountInstruction(txCloseAccount, associatedUserVault, payer);
    }

    return {
      txs,
      txCreateAccount: txCreateAccount.instructions.length ? txCreateAccount : undefined,
      txCloseAccount: txCloseAccount.instructions.length ? txCloseAccount : undefined,
      positionClosed,
    };
  }

  public async getUserPositions({
    payer,
    poolAddress: pair,
  }: GetUserPositionsParams): Promise<PositionInfo[]> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(payer, {
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });

    const positionMints = tokenAccounts.value
      .filter((acc) => {
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        return amount && amount > 0;
      })
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

    const arrPositionPda = positionMints.map((mint) => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(utils.bytes.utf8.encode('position')), mint.toBuffer()],
        this.lbProgram.programId
      );
      return positionPda;
    });

    let positions = [];
    try {
      // getMultipleAccountsInfo allows up to 100 accounts at once
      const arrPositionPdaChunked: PublicKey[][] = chunk(arrPositionPda, 100);
      const results: any[] = [];
      for (const item of arrPositionPdaChunked) {
        const accountsInfo = await this.connection.getMultipleAccountsInfo(item);
        results.push(...accountsInfo);
      }
      if (results.length !== arrPositionPda.length) {
        throw new Error('Invalid account info');
      }
      positions = await Promise.all(
        arrPositionPda.map(async (positionPda, idx) => {
          const accountInfo = results[idx];
          if (!accountInfo) return null;
          try {
            //@ts-ignore
            const position = await this.lbProgram.account.position.fetch(positionPda);
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
            const accountInfo = await this.connection.getAccountInfo(positionPda);
            if (!accountInfo) return null;
            //@ts-ignore
            const position = await this.lbProgram.account.position.fetch(positionPda);
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
      .map(
        (item) =>
          ({
            liquidityShares: item.liquidityShares,
            lowerBinId: item.lowerBinId,
            upperBinId: item.upperBinId,
            positionMint: item.positionMint,
            position: item.position,
          }) as PositionInfo
      );
  }
}
