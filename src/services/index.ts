import { SarosBaseService, SarosConfig } from './base';
import { SwapService } from './swap/index';
import { PositionService } from './position/index';
import { PairService } from './pair/index';
import {
  SwapParams,
  QuoteParams,
  QuoteResponse,
  CreatePositionParams,
  AddLiquidityByShapeParams,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
  GetUserPositionsParams,
  CreatePairParams,
  PairMetadata,
  DLMMPairAccount,
  GetPairLiquidityParams,
  PairLiquidityData,
  PositionAccount,
  GetPositionBinBalancesParams,
  PositionBinBalance,
  CreatePairResponse,
  GetBinArrayInfoParams,
  BinArray,
  GetMaxAmountOutWithFeeResponse,
  GetMaxAmountOutWithFeeParams,
} from '../types';
import { PublicKey, Transaction } from '@solana/web3.js';

export class SarosDLMM extends SarosBaseService {
  bufferGas?: number;
  private swapService: SwapService;
  private positionService: PositionService;
  private pairService: PairService;

  constructor(config: SarosConfig) {
    super(config);
    this.swapService = new SwapService(config);
    this.positionService = new PositionService(config);
    this.pairService = new PairService(config);
  }

  /**
   * Get a quote for a swap
   */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    const pairMetadata = await this.getPairMetadata(params.pair.toString());
    return await this.swapService.getQuote(params, pairMetadata);
  }

  /**
   * Execute a swap transaction
   */
  public async swap(params: SwapParams): Promise<Transaction> {
    return await this.swapService.swap(params);
  }

  /**
   * Calculate maximum theoretical output for price impact analysis
   */
  public async getMaxAmountOutWithFee(
    params: GetMaxAmountOutWithFeeParams
  ): Promise<GetMaxAmountOutWithFeeResponse> {
    return await this.swapService.getMaxAmountOutWithFee(params);
  }
  /**
   * Create a new position in a specific pool
   */
  public async createPosition(params: CreatePositionParams): Promise<Transaction> {
    const pairInfo: DLMMPairAccount = await this.pairService.getPairAccount(params.pair);
    return await this.positionService.createPosition(params, pairInfo);
  }

  /**
   * Add liquidity to an existing position
   */
  public async addLiquidityByShape(params: AddLiquidityByShapeParams): Promise<Transaction> {
    const pairInfo: DLMMPairAccount = await this.pairService.getPairAccount(params.pair);
    return await this.positionService.addLiquidityByShape(params, pairInfo);
  }

  /**
   * Remove liquidity from one or more positions.
   * Execute transactions in order: setupTransaction → transactions → cleanupTransaction.
   * closedPositions lists positions that will be fully closed and burned.
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    const pairInfo = await this.pairService.getPairAccount(params.pair);
    return await this.positionService.removeLiquidity(params, pairInfo);
  }

  /**
   * Get all user positions in a specific pool
   */
  public async getUserPositions(params: GetUserPositionsParams): Promise<PositionAccount[]> {
    return await this.positionService.getUserPositions(params);
  }

  /**
   * Get bin array information for a pool
   */
  public async getBinArrayInfo(params: GetBinArrayInfoParams): Promise<BinArray> {
    return await this.positionService.getBinArrayInfo(params);
  }

  /**
   * Get position account data by position address
   */
  public async getPositionAccount(position: PublicKey): Promise<PositionAccount> {
    return await this.positionService.getPositionAccount(position);
  }

  /**
   * Get detailed token balances for each bin in a position
   */
  public async getPositionBinBalances(
    params: GetPositionBinBalancesParams
  ): Promise<PositionBinBalance[]> {
    return await this.positionService.getPositionBinBalances(params);
  }

  /**
   * Create a new pool. Requires a token pair with unique binStep and ratePrice.
   */
  public async createPair(params: CreatePairParams): Promise<CreatePairResponse> {
    return await this.pairService.createPairWithConfig(params);
  }

  /**
   * Fetch metadata for a specific pool
   */
  public async getPairMetadata(pair: string): Promise<PairMetadata> {
    return await this.pairService.getPairMetadata(pair);
  }

  /**
   * Get list of all Saros DLMM pool addresses
   */
  public async getAllPairAddresses(): Promise<string[]> {
    return await this.pairService.getAllPairAddresses();
  }

  /**
   * Listen for new pool addresses being created and call postTxFunction with the new address
   */
  public async listenNewPairAddress(postTxFunction: (address: string) => Promise<void>) {
    return await this.pairService.listenNewPairAddress(postTxFunction);
  }

  /**
   * Get all bins with liquidity for a given pool
   */
  public async getPairLiquidity(params: GetPairLiquidityParams): Promise<PairLiquidityData> {
    return await this.pairService.getPairLiquidity(params);
  }
}
