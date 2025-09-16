import { LiquidityBookAbstract } from './base/abstract';
import { SwapService } from './swap/index';
import { PositionService } from './positions/index';
import { PoolService } from './pools/index';
import {
  ILiquidityBookConfig,
  SwapParams,
  QuoteParams,
  QuoteResponse,
  CreatePositionParams,
  AddLiquidityIntoPositionParams,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
  GetBinsReserveParams,
  BinReserveInfo,
  UserPositionsParams,
  PositionInfo,
  CreatePairWithConfigParams as CreatePoolParams,
  PoolMetadata,
  DLMMPairAccount,
} from '../types';
import { Transaction } from '@solana/web3.js';
import { PoolServiceError } from './pools/errors';

export class LiquidityBookServices extends LiquidityBookAbstract {
  bufferGas?: number;
  private swapService: SwapService;
  private positionService: PositionService;
  private poolService: PoolService;

  constructor(config: ILiquidityBookConfig) {
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
    if (!poolMetadata) throw PoolServiceError.PoolNotFound;

    return this.swapService.getQuote(params, poolMetadata);
  }

  //
  // POSITION Methods
  //
  public async createPosition(params: CreatePositionParams) {
    // get pair info first to verify pool exists and pass to createPosition
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.pair);
    return this.positionService.createPosition(params, pairInfo);
  }

  public async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    // same here
    const pairInfo: DLMMPairAccount = await this.poolService.getPoolAccount(params.pair);
    return this.positionService.addLiquidityIntoPosition(params, pairInfo);
  }

  public async removeMultipleLiquidity(
    params: RemoveMultipleLiquidityParams
  ): Promise<RemoveMultipleLiquidityResponse> {
    return this.positionService.removeMultipleLiquidity(params);
  }

  public async getBinsReserveInformation(params: GetBinsReserveParams): Promise<BinReserveInfo[]> {
    return this.positionService.getBinsReserveInformation(params);
  }

  public async getUserPositions({ payer, pair }: UserPositionsParams): Promise<PositionInfo[]> {
    return this.positionService.getUserPositions({ payer, pair });
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
}
