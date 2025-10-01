import { BN } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { SarosBaseService, SarosConfig } from './base/index';
import {
  calculateBinArrayIndex,
  getBinArrayWithAdjacent,
  getLiquidityBinArrays,
  getQuoteBinArrays,
  getRemovalBinArrays,
  getSwapBinArrays,
} from '../utils/bin-arrays';
import { getFeeAmount, getFeeForAmount, getFeeMetadata, getProtocolFee, getTotalFee } from '../utils/fees';
import { Volatility } from '../utils/volatility';
import { BinArrayRange } from '../utils/bin-range';
import { BIN_ARRAY_SIZE, MAX_BIN_CROSSINGS, SCALE_OFFSET, WRAP_SOL_PUBKEY } from '../constants';
import {
  DLMMPairAccount,
  PairMetadata,
  QuoteResponse,
  BinArray,
  RemoveLiquidityResponse,
  PositionAccount,
  PositionReserve,
  GetMaxAmountOutWithFeeResponse,
  QuoteParams,
  SwapParams,
  GetMaxAmountOutWithFeeParams,
  CreatePositionParams,
  AddLiquidityByShapeParams,
  RemoveLiquidityParams,
} from '../types';
import { getPriceFromId } from '../utils/price';
import { getPairTokenAccounts, getUserVaults } from '../utils/vault-accounts';
import { SarosDLMMError } from '../utils/errors';
import {
  getAmountInByPrice,
  getAmountOutByPrice,
  getPriceImpact,
  getMinOutputWithSlippage,
  getMaxInputWithSlippage,
} from '../utils/calculations';
import { addSolTransferInstructions, addOptimalComputeBudget } from '../utils/transaction';
import { createUniformDistribution, Distribution, calculateDistributionAmounts } from '../utils/bin-distribution';
import { ensureHookTokenAccount } from '../utils/hooks';
import { derivePositionTokenAccount, getMultiplePositionAccounts } from '../utils/positions';
import { handleSolWrapping } from '../utils/transaction';
import { calculateRemovedShares } from '../utils/remove-liquidity';
import { deriveHookPDA, derivePositionHookPDA, derivePositionPDA } from '../utils/pda';

export class SarosDLMMPair extends SarosBaseService {
  private pairAddress: PublicKey;
  private pairAccount!: DLMMPairAccount;
  private metadata!: PairMetadata;
  private volatilityManager: Volatility;
  bufferGas?: number;

  private tokenProgramX?: PublicKey;
  private tokenProgramY?: PublicKey;
  private tokenVaultX?: PublicKey;
  private tokenVaultY?: PublicKey;

  constructor(config: SarosConfig, pairAddress: PublicKey) {
    super(config);
    this.pairAddress = pairAddress;
    this.volatilityManager = new Volatility();
  }

  /** Get pair metadata */
  public getPairMetadata(): PairMetadata {
    return this.metadata;
  }

  /** Get pair account data */
  public getPairAccount(): DLMMPairAccount {
    return this.pairAccount;
  }

  /** Get pair address */
  public getPairAddress(): PublicKey {
    return this.pairAddress;
  }

  /** load pair state data */
  public async loadState(pairAddress?: string): Promise<void> {
    try {
      //@ts-ignore
      this.pairAccount = await this.lbProgram.account.pair.fetch(this.pairAddress || pairAddress);
      if (!this.pairAccount) throw SarosDLMMError.PairFetchFailed();

      this.metadata = await this.buildPairMetadata();
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.PairFetchFailed());
    }
  }

  /** Get position account data by position address  */
  public async getPositionAccount(position: PublicKey): Promise<PositionAccount> {
    //@ts-ignore
    return await this.lbProgram.account.position.fetch(position);
  }

  /** Legacy: get reserves for bin array */
  public async getBinArrayReserves(binArrayIndex: number): Promise<BinArray> {
    try {
      return await getBinArrayWithAdjacent(binArrayIndex, this.pairAddress, this.lbProgram);
    } catch (_error) {
      throw SarosDLMMError.BinArrayInfoFailed();
    }
  }

  /** Get reserves around the active bin for this pair. */
  public async getActiveReserves(range: number = 1) {
    const { activeId } = this.pairAccount;
    const binArrayIndex = calculateBinArrayIndex(activeId);
    const { bins, index } = await this.getBinArrayReserves(binArrayIndex);

    const firstBinIndex = index * BIN_ARRAY_SIZE;

    return Array.from({ length: range * 2 + 1 }, (_, i) => {
      const binId = activeId - range + i;
      const relativeIdx = binId - firstBinIndex;
      const bin = bins[relativeIdx];

      return bin
        ? {
            binId,
            reserveX: BigInt(bin.reserveX.toString()),
            reserveY: BigInt(bin.reserveY.toString()),
            totalSupply: BigInt(bin.totalSupply.toString()),
          }
        : null;
    }).filter(Boolean);
  }

  /**
   * Create a new position in this pair.
   *
   * Must be executed before adding liquidity with {@link addLiquidityByShape}.
   */
  async createPosition(params: CreatePositionParams): Promise<Transaction> {
    const { payer, binRange, positionMint } = params;
    const [binIdLeft, binIdRight] = binRange;
    const activeBinId = this.pairAccount.activeId;
    const lowerBinId = activeBinId + binIdLeft;
    const upperBinId = activeBinId + binIdRight;

    const transaction = new Transaction();

    await getLiquidityBinArrays(
      lowerBinId,
      upperBinId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId,
      payer,
      this.lbProgram,
      transaction
    );

    const position = derivePositionPDA(positionMint, this.lbProgram.programId);
    const positionTokenAccount = derivePositionTokenAccount(positionMint, payer);

    const ix = await this.lbProgram.methods
      .createPosition(new BN(binIdLeft), new BN(binIdRight))
      .accountsPartial({
        pair: this.pairAddress,
        position,
        positionMint,
        positionTokenAccount,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        user: payer,
      })
      .instruction();

    transaction.add(ix);
    return transaction;
  }

  /**
   * Add liquidity to an existing position using a shape distribution.
   *
   * Requires a position to be created first via {@link createPosition},
   * and that transaction must be executed before calling this method.
   */
  async addLiquidityByShape(params: AddLiquidityByShapeParams): Promise<Transaction> {
    const { positionMint, payer, transaction: userTxn, amountTokenX, amountTokenY, liquidityShape, binRange } = params;

    const { tokenMintX, tokenMintY } = this.pairAccount;
    if (amountTokenX <= 0n && amountTokenY <= 0n) {
      throw SarosDLMMError.CannotAddZero();
    }

    const tx = userTxn || new Transaction();

    const { userVaultX, userVaultY } = await getUserVaults(tokenMintX, tokenMintY, payer, this.connection, tx);

    // Get or create pair vault addresses
    const pairTokenAccounts = await getPairTokenAccounts(tokenMintX, tokenMintY, this.pairAddress, this.connection, {
      payer,
      transaction: tx,
      createVaultsIfNeeded: true,
    });
    const associatedPairVaultX = pairTokenAccounts.vaultX;
    const associatedPairVaultY = pairTokenAccounts.vaultY;

    const liquidityDistribution: Distribution[] = createUniformDistribution({
      shape: liquidityShape,
      binRange,
    });

    const lowerBinId = this.pairAccount.activeId + binRange[0];
    const upperBinId = this.pairAccount.activeId + binRange[1];

    const { binArrayLower, binArrayUpper } = await getLiquidityBinArrays(
      lowerBinId,
      upperBinId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId,
      payer,
      this.lbProgram,
      tx
    );

    if (this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY) || this.pairAccount.tokenMintX.equals(WRAP_SOL_PUBKEY)) {
      const isNativeY = this.pairAccount.tokenMintY.equals(WRAP_SOL_PUBKEY);
      const { scaledAmount } = calculateDistributionAmounts(
        liquidityDistribution,
        amountTokenX,
        amountTokenY,
        isNativeY
      );

      if (!scaledAmount.isZero()) {
        const associatedUserVault = isNativeY ? userVaultY : userVaultX;
        addSolTransferInstructions(tx, payer, associatedUserVault, scaledAmount);
      }
    }

    const hook = deriveHookPDA(this.hooksConfig, this.pairAddress, this.hooksProgram.programId);
    const position = derivePositionPDA(positionMint, this.lbProgram.programId);
    const positionTokenAccount = derivePositionTokenAccount(positionMint, payer);

    const ix = await this.lbProgram.methods
      .increasePosition(new BN(amountTokenX.toString()), new BN(amountTokenY.toString()), liquidityDistribution)
      .accountsPartial({
        pair: this.pairAddress,
        position,
        binArrayLower,
        binArrayUpper,
        tokenVaultX: associatedPairVaultX,
        tokenVaultY: associatedPairVaultY,
        userVaultX,
        userVaultY,
        positionTokenAccount,
        tokenMintX,
        tokenMintY,
        tokenProgramX: this.tokenProgramX,
        tokenProgramY: this.tokenProgramY,
        positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
        hook,
        hooksProgram: this.hooksProgram.programId,
        user: payer,
        positionMint,
      })
      .remainingAccounts([
        { pubkey: this.pairAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    await addOptimalComputeBudget(tx, this.connection, this.bufferGas);
    tx.add(ix);

    return tx;
  }

  /** Get all user positions in this pair */
  public async getUserPositions(params: { payer: PublicKey }): Promise<PositionAccount[]> {
    // Position mints are TOKEN_2022
    const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(params.payer, {
      programId: spl.TOKEN_2022_PROGRAM_ID,
    });

    if (token2022Accounts.value.length === 0) {
      return [];
    }

    // Extract position mints from accounts with balance > 0
    const positionMints = token2022Accounts.value
      .filter((acc) => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
      .map((acc) => new PublicKey(acc.account.data.parsed.info.mint));

    if (positionMints.length === 0) {
      return [];
    }

    // Derive position PDAs
    const positionPdas = positionMints.map((mint) => derivePositionPDA(mint, this.lbProgram.programId));

    const positions = await getMultiplePositionAccounts(positionPdas, this.pairAddress, this.lbProgram);
    return positions.filter(Boolean).sort((a, b) => a.lowerBinId - b.lowerBinId);
  }

  /** Get token balances for each bin in a position */
  public async getPositionReserves(position: PublicKey): Promise<PositionReserve[]> {
    const positionInfo = await this.getPositionAccount(position);
    const firstBinId = positionInfo.lowerBinId;
    const binArrayIndex = calculateBinArrayIndex(firstBinId);

    const { bins, index } = await this.getBinArrayReserves(binArrayIndex);

    const firstBinIndex = index * BIN_ARRAY_SIZE;
    const binIds = Array.from(
      { length: positionInfo.upperBinId - firstBinId + 1 },
      (_, i) => firstBinId - firstBinIndex + i
    );

    return binIds.map((binId: number, idx: number) => {
      const liquidityShare = positionInfo.liquidityShares[idx];
      const activeBin = bins[binId];

      if (activeBin) {
        const { reserveX, reserveY, totalSupply } = activeBin;

        const baseReserve =
          reserveX.gt(new BN(0)) && totalSupply.gt(new BN(0))
            ? liquidityShare.mul(reserveX).div(totalSupply)
            : new BN(0);

        const quoteReserve =
          reserveY.gt(new BN(0)) && totalSupply.gt(new BN(0))
            ? liquidityShare.mul(reserveY).div(totalSupply)
            : new BN(0);

        return {
          reserveX: BigInt(baseReserve.toString()),
          reserveY: BigInt(quoteReserve.toString()),
          totalSupply: BigInt(totalSupply.toString()),
          binId: firstBinId + idx,
          binPosition: binId,
          liquidityShare: BigInt(liquidityShare.toString()),
        };
      }

      return {
        reserveX: 0n,
        reserveY: 0n,
        totalSupply: 0n,
        binId: firstBinId + idx,
        binPosition: binId,
        liquidityShare: BigInt(liquidityShare.toString()),
      };
    });
  }

  /**
   * Remove liquidity from one or more positions in this pair.
   *
   * Callers are responsible for submitting these transactions in order:
   * 1. setupTransaction (if present)
   * 2. transactions
   * 3. cleanupTransaction (if present)
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const { positionMints, payer, type } = params;
    const { tokenMintX, tokenMintY } = this.pairAccount;

    const setupTransaction = new Transaction();

    const tokenVaultX = this.tokenVaultX;
    const tokenVaultY = this.tokenVaultY;

    const { userVaultX, userVaultY } = await getUserVaults(
      tokenMintX,
      tokenMintY,
      payer,
      this.connection,
      setupTransaction
    );
    const hook = deriveHookPDA(this.hooksConfig, this.pairAddress, this.hooksProgram.programId);
    await ensureHookTokenAccount(hook, tokenMintY, this.tokenProgramY!, payer, this.connection, setupTransaction);

    const closedPositions: PublicKey[] = [];
    const transactions = await Promise.all(
      positionMints.map(async (positionMint) => {
        const position = derivePositionPDA(positionMint, this.lbProgram.programId);
        const positionAccount = await this.getPositionAccount(position);
        const binArrayIndex = calculateBinArrayIndex(positionAccount.lowerBinId);
        const { index } = await this.getBinArrayReserves(binArrayIndex);

        const { binArrayLower, binArrayUpper, hookBinArrayLower, hookBinArrayUpper } = getRemovalBinArrays(
          index,
          this.pairAddress,
          hook,
          this.lbProgram.programId,
          this.hooksProgram.programId
        );

        const tx = new Transaction();
        await addOptimalComputeBudget(tx, this.connection, this.bufferGas);

        const positionTokenAccount = derivePositionTokenAccount(positionMint, payer);
        const reserveXY = await this.getPositionReserves(position);
        const hookPosition = derivePositionHookPDA(hook, position, this.hooksProgram.programId);

        const { removedShares, shouldClosePosition } = calculateRemovedShares(
          reserveXY,
          type,
          positionAccount.lowerBinId,
          positionAccount.upperBinId
        );

        if (shouldClosePosition) {
          const ix = await this.lbProgram.methods
            .closePosition()
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower,
              binArrayUpper,
              tokenVaultX,
              tokenVaultY,
              userVaultX,
              userVaultY,
              positionTokenAccount,
              tokenMintX,
              tokenMintY,
              tokenProgramX: this.tokenProgramX,
              tokenProgramY: this.tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .instruction();

          closedPositions.push(position);
          tx.add(ix);
        } else {
          const ix = await this.lbProgram.methods
            .decreasePosition(removedShares)
            .accountsPartial({
              pair: this.pairAddress,
              position,
              binArrayLower,
              binArrayUpper,
              tokenVaultX,
              tokenVaultY,
              userVaultX,
              userVaultY,
              positionTokenAccount,
              tokenMintX,
              tokenMintY,
              tokenProgramX: this.tokenProgramX,
              tokenProgramY: this.tokenProgramY,
              positionTokenProgram: spl.TOKEN_2022_PROGRAM_ID,
              hook,
              hooksProgram: this.hooksProgram.programId,
              user: payer,
              positionMint,
            })
            .remainingAccounts([
              { pubkey: this.pairAddress, isWritable: false, isSigner: false },
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
    handleSolWrapping(
      cleanupTransaction,
      this.pairAccount.tokenMintX,
      this.pairAccount.tokenMintY,
      userVaultX,
      userVaultY,
      payer,
      { isPreSwap: false }
    );

    return {
      transactions,
      setupTransaction: setupTransaction.instructions.length ? setupTransaction : undefined,
      cleanupTransaction: cleanupTransaction.instructions.length ? cleanupTransaction : undefined,
      closedPositions,
    };
  }

  /** Get a quote for a swap on this pair */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    if (params.amount <= 0n) throw SarosDLMMError.ZeroAmount();
    if (params.slippage < 0 || params.slippage >= 100) throw SarosDLMMError.InvalidSlippage();

    try {
      const { tokenX, tokenY } = this.metadata;
      const {
        slippage,
        options: { swapForY, isExactInput },
      } = params;

      const data = await this.calculateInOutAmount(params);
      const { amountIn, amountOut } = data;

      let maxAmountIn = amountIn;
      let minAmountOut = amountOut;

      if (isExactInput) {
        minAmountOut = getMinOutputWithSlippage(amountOut, slippage);
      } else {
        maxAmountIn = getMaxInputWithSlippage(amountIn, slippage);
      }

      const { maxAmountOut } = await this.getMaxAmountOutWithFee({
        amount: amountIn,
        swapForY,
        decimalTokenX: tokenX.decimals,
        decimalTokenY: tokenY.decimals,
      });

      const priceImpact = getPriceImpact(amountOut, maxAmountOut);

      return {
        amountIn: amountIn,
        amountOut: amountOut,
        amount: maxAmountIn,
        // minTokenOut serves as slippage protection:
        // - Exact input: minimum output willing to accept
        // - Exact output: maximum input willing to pay
        minTokenOut: isExactInput ? minAmountOut : maxAmountIn,
        priceImpact: priceImpact,
      };
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.QuoteCalculationFailed());
    }
  }

  /**
   * Execute a swap transaction on this pair
   *
   * @example
   * // Always get a quote first, then pass quote.minTokenOut to swap
   * const quote = await pair.getQuote({
   *   amount: 1_000_000n,
   *   options: { swapForY: true, isExactInput: true },
   *   slippage: 1
   * });
   *
   * const tx = await pair.swap({
   *   tokenIn: tokenX,
   *   tokenOut: tokenY,
   *   amount: 1_000_000n,
   *   options: { swapForY: true, isExactInput: true },
   *   minTokenOut: quote.minTokenOut, // <- Slippage protection
   *   payer: wallet.publicKey
   * });
   */
  public async swap(params: SwapParams): Promise<Transaction> {
    const {
      amount,
      minTokenOut,
      options: { swapForY, isExactInput },
      payer,
      hook,
    } = params;

    if (amount <= 0n) throw SarosDLMMError.ZeroAmount();
    if (minTokenOut < 0n) throw SarosDLMMError.ZeroAmount();

    const tokenVaultX = this.tokenVaultX;
    const tokenVaultY = this.tokenVaultY;
    const tokenMintX = this.pairAccount.tokenMintX;
    const tokenMintY = this.pairAccount.tokenMintY;

    // Use provided hook or default to instance hook config
    const hookConfig = hook || this.hooksConfig;

    const { binArrayLower, binArrayUpper } = await getSwapBinArrays(
      this.pairAccount.activeId,
      this.pairAddress,
      this.connection,
      this.lbProgram.programId
    );

    const latestBlockHash = await this.connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    const { userVaultX, userVaultY } = await getUserVaults(tokenMintX, tokenMintY, payer, this.connection, tx);

    handleSolWrapping(tx, tokenMintX, tokenMintY, userVaultX, userVaultY, payer, {
      swapForY,
      amount,
      isPreSwap: true,
    });

    // minTokenOut is the slippage protection:
    // - Exact input: minimum output to accept
    // - Exact output: maximum input to pay
    const swapInstructions = await this.lbProgram.methods
      .swap(
        new BN(amount.toString()),
        new BN(minTokenOut.toString()),
        swapForY,
        isExactInput ? { exactInput: {} } : { exactOutput: {} }
      )
      .accountsPartial({
        pair: this.pairAddress,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        tokenVaultX,
        tokenVaultY,
        userVaultX,
        userVaultY,
        tokenMintX,
        tokenMintY,
        tokenProgramX: this.tokenProgramX,
        tokenProgramY: this.tokenProgramY,
        user: payer,
        hook: hookConfig,
        hooksProgram: this.hooksProgram.programId,
      })
      .remainingAccounts([
        { pubkey: this.pairAddress, isWritable: false, isSigner: false },
        { pubkey: binArrayLower, isWritable: false, isSigner: false },
        { pubkey: binArrayUpper, isWritable: false, isSigner: false },
      ])
      .instruction();

    tx.add(swapInstructions);

    handleSolWrapping(tx, tokenMintX, tokenMintY, userVaultX, userVaultY, payer, {
      swapForY,
      isPreSwap: false,
    });

    return tx;
  }

  /**
   * Calculate maximum output
   */
  public async getMaxAmountOutWithFee(params: GetMaxAmountOutWithFeeParams): Promise<GetMaxAmountOutWithFeeResponse> {
    try {
      const { amount, swapForY = false, decimalTokenX = 9, decimalTokenY = 9 } = params;
      if (amount <= 0n) throw SarosDLMMError.ZeroAmount();

      const { activeId, binStep } = this.pairAccount;

      const feePrice = getTotalFee(this.pairAccount, this.volatilityManager.getVolatilityAccumulator());
      const activePrice = getPriceFromId(binStep, activeId, decimalTokenX, decimalTokenY);

      const feeAmount = getFeeAmount(amount, feePrice);
      const amountAfterFee = amount - feeAmount;
      const maxAmountOut = swapForY
        ? (amountAfterFee * BigInt(activePrice)) >> BigInt(SCALE_OFFSET)
        : (amountAfterFee << BigInt(SCALE_OFFSET)) / BigInt(activePrice);

      return { maxAmountOut, price: activePrice };
    } catch {
      return { maxAmountOut: 0n, price: 0 };
    }
  }

  // -----------------------------------------------------------------------------
  // Internal/private helpers
  // The methods below are private helpers and not part of the public SDK.
  // -----------------------------------------------------------------------------

  private async buildPairMetadata(): Promise<PairMetadata> {
    const { tokenMintX, tokenMintY, hook } = this.pairAccount;
    const tokenAccountsData = await getPairTokenAccounts(tokenMintX, tokenMintY, this.pairAddress, this.connection);
    const feeInfo = getFeeMetadata(this.pairAccount);

    // Store results
    this.tokenVaultX = tokenAccountsData.vaultX;
    this.tokenVaultY = tokenAccountsData.vaultY;
    this.tokenProgramX = tokenAccountsData.tokenProgramX;
    this.tokenProgramY = tokenAccountsData.tokenProgramY;

    return {
      pair: this.pairAddress,
      tokenX: {
        mintAddress: tokenMintX,
        decimals: tokenAccountsData.baseDecimals,
        reserve: tokenAccountsData.reserveX.value.amount,
      },
      tokenY: {
        mintAddress: tokenMintY,
        decimals: tokenAccountsData.quoteDecimals,
        reserve: tokenAccountsData.reserveY.value.amount,
      },
      binStep: this.pairAccount.binStep,
      baseFee: feeInfo.baseFee,
      dynamicFee: feeInfo.dynamicFee,
      protocolFee: feeInfo.protocolFee,
      extra: { hook: hook || undefined },
    };
  }

  private async calculateInOutAmount(params: QuoteParams) {
    const {
      amount,
      options: { swapForY, isExactInput },
    } = params;
    try {
      const { binArrays } = await getQuoteBinArrays(this.pairAccount.activeId, this.pairAddress, this.lbProgram);

      const binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
      const totalSupply = binRange
        .getAllBins()
        .reduce((acc, cur) => acc.add(new BN(cur.totalSupply.toString())), new BN(0));
      if (totalSupply.isZero()) {
        return {
          amountIn: BigInt(0),
          amountOut: BigInt(0),
        };
      }

      const amountAfterTransferFee = amount;

      if (isExactInput) {
        const amountOut = await this.calculateAmountOut(amountAfterTransferFee, binRange, this.pairAccount, swapForY);

        return {
          amountIn: amount,
          amountOut,
        };
      } else {
        const amountIn = await this.calculateAmountIn(amountAfterTransferFee, binRange, this.pairAccount, swapForY);

        return {
          amountIn,
          amountOut: amountAfterTransferFee,
        };
      }
    } catch (error) {
      SarosDLMMError.handleError(error, SarosDLMMError.QuoteCalculationFailed());
    }
  }

  private async calculateAmountIn(amount: bigint, bins: BinArrayRange, pairInfo: DLMMPairAccount, swapForY: boolean) {
    try {
      let amountIn = BigInt(0);
      let amountOutLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatilityManager.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountOutLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatilityManager.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const volatility = this.volatilityManager.getVolatilityAccumulator();
        const fee = getTotalFee(pairInfo, volatility);

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactOutput({
          binStep: pairInfo.binStep,
          activeId,
          amountOutLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: new BN(activeBin.reserveX.toString()),
          reserveY: new BN(activeBin.reserveY.toString()),
        });

        amountIn += amountInWithFees;
        amountOutLeft -= amountOutOfBin;

        if (!amountOutLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }

      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw SarosDLMMError.SwapExceedsMaxBinCrossings();
      }

      return amountIn;
    } catch (error) {
      throw error;
    }
  }

  private async calculateAmountOut(amount: bigint, bins: BinArrayRange, pairInfo: DLMMPairAccount, swapForY: boolean) {
    try {
      let amountOut = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatilityManager.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountInLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatilityManager.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBinMut(activeId);
        if (!activeBin) {
          break;
        }

        const fee = getTotalFee(pairInfo, this.volatilityManager.getVolatilityAccumulator());

        const { amountInWithFees, amountOut: amountOutOfBin } = this.swapExactInput({
          binStep: pairInfo.binStep,
          activeId,
          amountInLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: new BN(activeBin.reserveX.toString()),
          reserveY: new BN(activeBin.reserveY.toString()),
        });

        amountOut += amountOutOfBin;
        amountInLeft -= amountInWithFees;

        if (!amountInLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }
      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw SarosDLMMError.SwapExceedsMaxBinCrossings();
      }

      return amountOut;
    } catch (error) {
      throw error;
    }
  }

  private swapExactOutput(params: {
    binStep: number;
    activeId: number;
    amountOutLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountOutLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      throw SarosDLMMError.BinHasNoReserves();
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());
    const amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    const price = getPriceFromId(binStep, activeId, this.metadata.tokenX.decimals, this.metadata.tokenY.decimals);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    const amountInWithoutFee = getAmountInByPrice(amountOut, priceScaled, swapForY, 'up');

    const feeAmount = getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = getProtocolFee(feeAmount, protocolShareBigInt);

    return {
      amountInWithFees: amountIn,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  private swapExactInput(params: {
    binStep: number;
    activeId: number;
    amountInLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountInLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      throw SarosDLMMError.BinHasNoReserves();
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());

    const price = getPriceFromId(binStep, activeId, this.metadata.tokenX.decimals, this.metadata.tokenY.decimals);
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    let maxAmountIn = getAmountInByPrice(binReserveOutBigInt, priceScaled, swapForY, 'up');

    const maxFeeAmount = getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = getAmountOutByPrice(amountIn, priceScaled, swapForY, 'down');
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount = protocolShare > BigInt(0) ? getProtocolFee(feeAmount, protocolShareBigInt) : BigInt(0);

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  private moveActiveId(pairId: number, swapForY: boolean): number {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }
}
