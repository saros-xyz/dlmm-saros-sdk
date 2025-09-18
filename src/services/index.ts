import { SarosBaseService, SarosConfig } from './base';
import { SwapService } from './swap/index';
import { PositionService } from './positions/index';
import { PoolService } from './pools/index';
import {
  SwapParams,
  QuoteParams,
  QuoteResponse,
  CreatePositionParams,
  AddLiquidityToPositionParams,
  RemoveLiquidityParams,
  RemoveLiquidityResponse,
  GetUserPositionsParams,
  PositionInfo,
  CreatePoolParams,
  PoolMetadata,
  DLMMPairAccount,
  GetPoolLiquidityParams,
  PoolLiquidityData,
} from '../types';
import { Transaction } from '@solana/web3.js';

export class SarosDLMM extends SarosBaseService {
  bufferGas?: number;
  private swapService: SwapService;
  private positionService: PositionService;
  private poolService: PoolService;

  constructor(config: SarosConfig) {
    super(config);
    this.swapService = new SwapService(config);
    this.positionService = new PositionService(config);
    this.poolService = new PoolService(config);
  }

  /**
   * Get a quote for a swap
   */
  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    const poolMetadata = await this.getPoolMetadata(params.pair.toString());
    return this.swapService.getQuote(params, poolMetadata);
  }

  /**
   * Execute a swap transaction
   */
  public async swap(params: SwapParams): Promise<Transaction> {
    return this.swapService.swap(params);
  }

  /**
   *  Create a new position in a specific pool
   */
  public async createPosition(params: CreatePositionParams) {
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.poolAddress);
    return this.positionService.createPosition(params, pairInfo);
  }

  /**   * Add liquidity to an existing position
   */
  public async addLiquidityToPosition(params: AddLiquidityToPositionParams) {
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.poolAddress);
    return this.positionService.addLiquidityToPosition(params, pairInfo);
  }

  /**   * Remove liquidity from one or more positions
   */
  public async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResponse> {
    return this.positionService.removeLiquidity(params);
  }

  /**
   * Get all user positions in a specific pool
   */
  public async getUserPositions(params: GetUserPositionsParams): Promise<PositionInfo[]> {
    return this.positionService.getUserPositions(params);
  }

  /**
   * Create a new pool. Requires a new pair with unique binStep and ratePrice.
   */
  public async createPool(params: CreatePoolParams) {
    return this.poolService.createPairWithConfig(params);
  }

  /**   * Fetch metadata for a specific pool
   */
  public async getPoolMetadata(pair: string): Promise<PoolMetadata> {
    return this.poolService.getPoolMetadata(pair);
  }

  /**   * Get list of all Saros DLMM pool addresses
   */
  public async getAllPoolAddresses(): Promise<string[]> {
    return this.poolService.getAllPoolAddresses();
  }

  /**   * Listen for new pool addresses being created and call postTxFunction with the new address
   */
  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    return this.poolService.listenNewPoolAddress(postTxFunction);
  }

  // ** NEW: Get all bins with liquidity for a given pool
  public async getPoolLiquidity(params: GetPoolLiquidityParams): Promise<PoolLiquidityData> {
    return this.poolService.getPoolLiquidity(params);
  }
}
