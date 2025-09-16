import { LiquidityBookAbstract } from './base/abstract';
import { SwapService } from './swap/index';
import { PositionService } from './positions/index';
import { PoolService } from './pools/index';
import { BinArrayManager } from './pools/bins';
import { getPairVaultInfo, GetPairVaultInfoParams, getUserVaultInfo } from '../utils/vaults';
import {
  ILiquidityBookConfig,
  SwapParams,
  GetTokenOutputParams,
  GetTokenOutputResponse,
  CreatePositionParams,
  AddLiquidityIntoPositionParams,
  RemoveMultipleLiquidityParams,
  RemoveMultipleLiquidityResponse,
  GetBinsReserveParams,
  BinReserveInfo,
  UserPositionsParams,
  PositionInfo,
  CreatePairWithConfigParams,
  PoolMetadata,
  DLMMPairAccount,
  PositionAccount,
  GetUserVaultInfoParams,
  QuoteParams,
  GetBinsArrayInfoParams,
  GetPoolMetadataParams,
} from '../types';
import { PublicKey, Transaction } from '@solana/web3.js';

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

  // Swap Service Methods
  public async swap(params: SwapParams): Promise<Transaction> {
    return this.swapService.swap(params);
  }

  public async getQuote(params: GetTokenOutputParams): Promise<GetTokenOutputResponse> {
    return this.swapService.getQuote(params);
  }

  public async getMaxAmountOutWithFee(
    pairAddress: PublicKey,
    amount: bigint,
    swapForY: boolean = false,
    decimalBase: number = 9,
    decimalQuote: number = 9
  ): Promise<{ maxAmountOut: bigint; price: number }> {
    return this.swapService.getMaxAmountOutWithFee(
      pairAddress,
      amount,
      swapForY,
      decimalBase,
      decimalQuote
    );
  }

  // Position Service Methods
  public async getPositionAccount(position: PublicKey): Promise<PositionAccount> {
    return this.positionService.getPositionAccount(position);
  }

  public async createPosition(params: CreatePositionParams) {
    return this.positionService.createPosition(params);
  }

  public async addLiquidityIntoPosition(params: AddLiquidityIntoPositionParams) {
    return this.positionService.addLiquidityIntoPosition(params);
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

  // Pool Service Methods
  public async getPairAccount(pair: PublicKey): Promise<DLMMPairAccount> {
    return this.poolService.getPairAccount(pair);
  }

  public async createPairWithConfig(params: CreatePairWithConfigParams) {
    return this.poolService.createPairWithConfig(params);
  }

  public async getPoolMetadata(params: GetPoolMetadataParams): Promise<PoolMetadata> {
    return this.poolService.getPoolMetadata(params.pair);
  }

  public async getAllPoolAddresses(): Promise<string[]> {
    return this.poolService.getAllPoolAddresses();
  }

  public async listenNewPoolAddress(postTxFunction: (address: string) => Promise<void>) {
    return this.poolService.listenNewPoolAddress(postTxFunction);
  }

  public async quote(params: QuoteParams) {
    return this.poolService.quote(params);
  }

  // Legacy compatibility methods (delegated to appropriate services)
  async getBinArray(params: {
    binArrayIndex: number;
    pair: PublicKey;
    payer?: PublicKey;
    transaction?: Transaction;
  }): Promise<PublicKey> {
    return BinArrayManager.getBinArrayAddress(
      params.binArrayIndex,
      params.pair,
      this.lbProgram.programId
    );
  }

  public async getBinArrayInfo(params: GetBinsArrayInfoParams) {
    return this.positionService.getBinArrayInfo(params);
  }

  public async getPairVaultInfo(params: GetPairVaultInfoParams) {
    return getPairVaultInfo(params, this.connection);
  }

  public async getUserVaultInfo(params: GetUserVaultInfoParams) {
    return getUserVaultInfo(params, this.connection);
  }
}
