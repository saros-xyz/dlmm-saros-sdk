import { SarosBaseService, SarosConfig } from './base';
import { SwapService } from './swap/index';
import { PositionService } from './positions/index';
import { PoolService } from './pools/index';
import {
  SwapParams,
  QuoteParams,
  QuoteResponse,
  CreatePositionParams,
  AddLiquidityIntoPositionParams,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
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

  //
  // SWAP Methods
  //
  public async swap(params: SwapParams): Promise<Transaction> {
    return this.swapService.swap(params);
  }

  public async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    // fetch pool metadata and pass to getQuote instead of requiring user to do it
    const poolMetadata = await this.getPoolMetadata(params.pair.toString());
    return this.swapService.getQuote(params, poolMetadata);
  }

  //
  // POSITION Methods
  //
  public async createPosition(params: CreatePositionParams) {
    // get pair info first to verify pool exists and pass to createPosition
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.poolAddress);
    return this.positionService.createPosition(params, pairInfo);
  }

  public async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    // same here
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.poolAddress);
    return this.positionService.addLiquidityIntoPosition(params, pairInfo);
  }

  public async removeMultipleLiquidity(
    params: RemoveMultipleLiquidityParams
  ): Promise<RemoveMultipleLiquidityResponse> {
    return this.positionService.removeMultipleLiquidity(params);
  }

  /**
   * Get all user positions in a specific pool
   */
  public async getUserPositions(params: GetUserPositionsParams): Promise<PositionInfo[]> {
    return this.positionService.getUserPositions(params);
  }

  //
  // POOL Methods
  //
  public async createPool(params: CreatePoolParams) {
    return this.poolService.createPairWithConfig(params);
  }

  public async getPoolMetadata(pair: string): Promise<PoolMetadata> {
    return this.poolService.getPoolMetadata(pair);
  }

  public async getAllPoolAddresses(): Promise<string[]> {
    return this.poolService.getAllPoolAddresses();
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    return this.poolService.listenNewPoolAddress(postTxFunction);
  }

  // ** NEW: Get all bins with liquidity for a given pool
  public async getPoolLiquidity(params: GetPoolLiquidityParams): Promise<PoolLiquidityData> {
    return this.poolService.getPoolLiquidity(params);
  }
}
