import { BN, utils } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { chunk } from 'lodash';
import { SarosBaseService, SarosConfig } from '../base';
import { LiquidityManager } from './liquidity';
import { BIN_ARRAY_SIZE, MAX_BASIS_POINTS_BIGINT, WRAP_SOL_PUBKEY } from '../../constants';
import {
  AddLiquidityByShapeParams,
  PositionBinBalance,
  CreatePositionParams,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
  GetUserPositionsParams,
  BinArray,
  PositionAccount,
  DLMMPairAccount,
  GetPositionBinBalancesParams,
} from '../../types';
import {
  addSolTransferInstructions,
  addCloseAccountInstruction,
  addOptimalComputeBudget,
} from '../../utils/transaction';
import { getUserVaultInfo, getPairVaultInfo, getTokenProgram } from '../../utils/vaults';
import { BinArrayManager } from '../pools/bin-manager';
import { createUniformDistribution } from './bin-distribution';
import { PositionServiceError } from './errors';

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
      const current = BinArrayManager.getBinArrayAddress(
        binArrayIndex,
        pair,
        this.lbProgram.programId
      );
      //@ts-ignore
      const { bins: currentBins } = await this.lbProgram.account.binArray.fetch(current);

      try {
        const next = BinArrayManager.getBinArrayAddress(
          binArrayIndex + 1,
          pair,
          this.lbProgram.programId
        );
        //@ts-ignore
        const { bins: nextBins } = await this.lbProgram.account.binArray.fetch(next);
        return { bins: [...currentBins, ...nextBins], index: binArrayIndex };
      } catch {
        try {
          const prev = BinArrayManager.getBinArrayAddress(
            binArrayIndex - 1,
            pair,
            this.lbProgram.programId
          );
          //@ts-ignore
          const { bins: prevBins } = await this.lbProgram.account.binArray.fetch(prev);
          return { bins: [...prevBins, ...currentBins], index: binArrayIndex - 1 };
        } catch {
          return { bins: currentBins, index: binArrayIndex };
        }
      }
    } catch (error) {
      throw new Error(`Failed to get bin array info for index ${binArrayIndex}: ${error}`);
    }
  }

  public async getPositionBinBalances(
    params: GetPositionBinBalancesParams
  ): Promise<PositionBinBalance[]> {
    const { position, pair, payer } = params;
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = BinArrayManager.calculateBinArrayIndex(firstBinId);

    const { bins, index } = await this.getBinArrayInfo({ binArrayIndex, pair, payer });

    const firstBinIndex = index * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    return binIds.map((binId: number, idx: number) => {
      const liquidityShare = positionInfo.liquidityShares[idx];
      const activeBin = bins[binId];
      const liquidityShareBigInt = BigInt(liquidityShare.toString());

      if (activeBin) {
        const baseReserve =
          activeBin.reserveX > 0n
            ? (liquidityShareBigInt * activeBin.reserveX) / activeBin.totalSupply
            : 0n;
        const quoteReserve =
          activeBin.reserveY > 0n
            ? (liquidityShareBigInt * activeBin.reserveY) / activeBin.totalSupply
            : 0n;

        return {
          baseReserve,
          quoteReserve,
          totalSupply: activeBin.totalSupply,
          binId: firstBinId + idx,
          binPosition: binId,
          liquidityShare: liquidityShareBigInt,
        };
      }

      return {
        baseReserve: 0n,
        quoteReserve: 0n,
        totalSupply: 0n,
        binId: firstBinId + idx,
        binPosition: binId,
        liquidityShare: liquidityShareBigInt,
      };
    });
  }

  async createPosition(
    params: CreatePositionParams,
    pairInfo: DLMMPairAccount
  ): Promise<Transaction> {
    const { payer, binRange, poolAddress, positionMint } = params;
    const [binIdLeft, binIdRight] = binRange;
    const activeBinId = pairInfo.activeId;
    const lowerBinId = activeBinId + binIdLeft;
    const upperBinId = activeBinId + binIdRight;

    const transaction = new Transaction();

    await BinArrayManager.addInitializeBinArrayInstruction(
      BinArrayManager.calculateBinArrayIndex(lowerBinId),
      poolAddress,
      payer,
      transaction,
      this.connection,
      this.lbProgram
    );

    if (
      BinArrayManager.calculateBinArrayIndex(lowerBinId) !==
      BinArrayManager.calculateBinArrayIndex(upperBinId)
    ) {
      await BinArrayManager.addInitializeBinArrayInstruction(
        BinArrayManager.calculateBinArrayIndex(upperBinId),
        poolAddress,
        payer,
        transaction,
        this.connection,
        this.lbProgram
      );
    }

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

    const ix = await this.lbProgram.methods
      .createPosition(new BN(binIdLeft), new BN(binIdRight))
      .accountsPartial({
        pair: poolAddress,
        position,
        positionMint,
        positionTokenAccount: positionVault,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        user: payer,
      })
      .instruction();

    transaction.add(ix);
    return transaction;
  }

  async addLiquidityByShape(
    params: AddLiquidityByShapeParams,
    pairInfo: DLMMPairAccount
  ): Promise<Transaction> {
    const {
      positionMint,
      payer,
      poolAddress,
      transaction: userTxn,
      baseAmount,
      quoteAmount,
      liquidityShape,
      binRange,
    } = params;

    if (baseAmount <= 0n && quoteAmount <= 0n) {
      throw PositionServiceError.CannotAddZero;
    }

    const transaction = userTxn || new Transaction();

    const tokenProgramX = await getTokenProgram(pairInfo.tokenMintX, this.connection);
    const tokenProgramY = await getTokenProgram(pairInfo.tokenMintY, this.connection);

    const associatedPairVaultX = await getPairVaultInfo(
      { tokenMint: pairInfo.tokenMintX, pair: poolAddress, payer, transaction },
      this.connection
    );
    const associatedPairVaultY = await getPairVaultInfo(
      { tokenMint: pairInfo.tokenMintY, pair: poolAddress, payer, transaction },
      this.connection
    );

    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: pairInfo.tokenMintX, payer, transaction },
      this.connection
    );
    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: pairInfo.tokenMintY, payer, transaction },
      this.connection
    );

    const liquidityDistribution = createUniformDistribution({ shape: liquidityShape, binRange });

    const lowerBinId = pairInfo.activeId + binRange[0];
    const upperBinId = pairInfo.activeId + binRange[1];

    const binArrayLower = BinArrayManager.getBinArrayAddress(
      BinArrayManager.calculateBinArrayIndex(lowerBinId),
      poolAddress,
      this.lbProgram.programId
    );
    const binArrayUpper = BinArrayManager.getBinArrayAddress(
      BinArrayManager.calculateBinArrayIndex(upperBinId),
      poolAddress,
      this.lbProgram.programId
    );

    if (
      pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      pairInfo.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const totalAmount = isNativeY ? quoteAmount : baseAmount;
      const totalLiquid = liquidityDistribution.reduce(
        (prev, curr) => prev + (isNativeY ? curr.quoteDistribution : curr.baseDistribution),
        0
      );

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

    const ix = await this.lbProgram.methods
      .increasePosition(
        new BN(baseAmount.toString()),
        new BN(quoteAmount.toString()),
        liquidityDistribution
      )
      .accountsPartial({
        pair: poolAddress,
        position,
        binArrayLower,
        binArrayUpper,
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
        hook,
        hooksProgram: this.hooksProgram.programId,
        user: payer,
        positionMint,
      })
      .instruction();

    await addOptimalComputeBudget(transaction, this.connection, this.bufferGas);
    transaction.add(ix);

    return transaction;
  }

  public async removeLiquidity(
    params: RemoveLiquidityParams,
    pairInfo: DLMMPairAccount
  ): Promise<RemoveLiquidityResponse> {
    const { positionMints, payer, type, poolAddress: pair } = params;

    const tokenProgramX = await getTokenProgram(pairInfo.tokenMintX, this.connection);
    const tokenProgramY = await getTokenProgram(pairInfo.tokenMintY, this.connection);

    const setupTransaction = new Transaction();

    const associatedPairVaultX = await getPairVaultInfo(
      { tokenMint: pairInfo.tokenMintX, pair, payer, transaction: setupTransaction },
      this.connection
    );
    const associatedPairVaultY = await getPairVaultInfo(
      { tokenMint: pairInfo.tokenMintY, pair, payer, transaction: setupTransaction },
      this.connection
    );
    const associatedUserVaultX = await getUserVaultInfo(
      { tokenMint: pairInfo.tokenMintX, payer, transaction: setupTransaction },
      this.connection
    );
    const associatedUserVaultY = await getUserVaultInfo(
      { tokenMint: pairInfo.tokenMintY, payer, transaction: setupTransaction },
      this.connection
    );

    const hook = PublicKey.findProgramAddressSync(
      [Buffer.from(utils.bytes.utf8.encode('hook')), this.hooksConfig.toBuffer(), pair.toBuffer()],
      this.hooksProgram.programId
    )[0];

    const associatedHookTokenY = spl.getAssociatedTokenAddressSync(
      pairInfo.tokenMintY,
      hook,
      true,
      tokenProgramY
    );
    const infoHookTokenY = await this.connection.getAccountInfo(associatedHookTokenY);

    if (!infoHookTokenY) {
      setupTransaction.add(
        spl.createAssociatedTokenAccountInstruction(
          payer,
          associatedHookTokenY,
          hook,
          pairInfo.tokenMintY,
          tokenProgramY
        )
      );
    }

    const closedPositions: string[] = [];
    const transactions = await Promise.all(
      positionMints.map(async (positionMint) => {
        const position = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), positionMint.toBuffer()],
          this.lbProgram.programId
        )[0];

        const positionAccount = await this.getPositionAccount(position);

        const { index } = await this.getBinArrayInfo({
          binArrayIndex: BinArrayManager.calculateBinArrayIndex(positionAccount.lowerBinId),
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
          positionMint,
          payer,
          true,
          spl.TOKEN_2022_PROGRAM_ID
        );

        const reserveXY = await this.getPositionBinBalances({ position, pair, payer });

        const hookBinArrayLower = BinArrayManager.getHookBinArrayAddress(
          hook,
          this.hooksProgram.programId,
          index
        );
        const hookBinArrayUpper = BinArrayManager.getHookBinArrayAddress(
          hook,
          this.hooksProgram.programId,
          index + 1
        );

        const hookPosition = PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), hook.toBuffer(), position.toBuffer()],
          this.hooksProgram.programId
        )[0];

        const removedShares = LiquidityManager.calculateRemovedShares(
          reserveXY,
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId
        );
        const availableShares = LiquidityManager.getAvailableShares(reserveXY, type);
        const isClosePosition = LiquidityManager.shouldClosePosition(
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId,
          availableShares
        );

        if (isClosePosition) {
          const ix = await this.lbProgram.methods
            .closePosition()
            .accountsPartial({
              pair,
              position,
              binArrayLower,
              binArrayUpper,
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
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          closedPositions.push(position.toString());
          tx.add(ix);
        } else {
          const ix = await this.lbProgram.methods
            .decreasePosition(removedShares)
            .accountsPartial({
              pair,
              position,
              binArrayLower,
              binArrayUpper,
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
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .remainingAccounts([
              { pubkey: pair, isWritable: false, isSigner: false },
              { pubkey: binArrayLower, isWritable: false, isSigner: false },
              { pubkey: binArrayUpper, isWritable: false, isSigner: false },
              { pubkey: hookBinArrayLower, isWritable: true, isSigner: false },
              { pubkey: hookBinArrayUpper, isWritable: true, isSigner: false },
              { pubkey: hookPosition, isWritable: true, isSigner: false },
            ])
            .instruction();

          tx.add(ix);
        }

        return tx;
      })
    );

    const cleanupTransaction = new Transaction();
    if (
      pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY) ||
      pairInfo.tokenMintX.equals(WRAP_SOL_PUBKEY)
    ) {
      const isNativeY = pairInfo.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const associatedUserVault = isNativeY ? associatedUserVaultY : associatedUserVaultX;
      addCloseAccountInstruction(cleanupTransaction, associatedUserVault, payer);
    }

    return {
      transactions,
      setupTransaction: setupTransaction.instructions.length ? setupTransaction : undefined,
      cleanupTransaction: cleanupTransaction.instructions.length ? cleanupTransaction : undefined,
      closedPositions,
    };
  }

  public async getUserPositions({
    payer,
    poolAddress: pair,
  }: GetUserPositionsParams): Promise<PositionAccount[]> {
    const [legacyAccountsResp, token2022AccountsResp] = await Promise.all([
      this.connection.getParsedTokenAccountsByOwner(payer, { programId: spl.TOKEN_PROGRAM_ID }),
      this.connection.getParsedTokenAccountsByOwner(payer, {
        programId: spl.TOKEN_2022_PROGRAM_ID,
      }),
    ]);

    const combined = [...legacyAccountsResp.value, ...token2022AccountsResp.value];

    const mints = Array.from(
      combined
        .filter((acc) => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .reduce(
          (set: Set<string>, acc) => set.add(acc.account.data.parsed.info.mint),
          new Set<string>()
        )
    ).map((m) => new PublicKey(m));

    const positionPdas = mints.map(
      (mint) =>
        PublicKey.findProgramAddressSync(
          [Buffer.from(utils.bytes.utf8.encode('position')), mint.toBuffer()],
          this.lbProgram.programId
        )[0]
    );

    const positions = await this.fetchPositionAccounts(positionPdas, pair);
    return positions.filter(Boolean).sort((a, b) => a.lowerBinId - b.lowerBinId);
  }

  private async fetchPositionAccounts(
    positionPdas: PublicKey[],
    pair: PublicKey
  ): Promise<PositionAccount[]> {
    try {
      const chunks = chunk(positionPdas, 100);
      const all: PositionAccount[] = [];

      for (const c of chunks) {
        //@ts-ignore
        const positions = await this.lbProgram.account.position.fetchMultiple(c);
        all.push(
          ...positions
            .map((p: any, i: number) =>
              p && p.pair.toString() === pair.toString()
                ? { ...p, position: c[i].toString() }
                : null
            )
            .filter(Boolean)
        );
      }

      return all;
    } catch {
      const positions = await Promise.all(
        positionPdas.map(async (pda) => {
          try {
            //@ts-ignore
            const p = await this.lbProgram.account.position.fetch(pda);
            if (p.pair.toString() !== pair.toString()) return null;
            return { ...p, position: pda.toString() };
          } catch {
            return null;
          }
        })
      );

      return positions.filter(Boolean);
    }
  }
}
