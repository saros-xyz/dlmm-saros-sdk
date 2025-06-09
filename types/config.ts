export enum MODE {
  TESTNET = 'testnet',
  DEVNET = 'devnet',
  MAINNET = 'mainnet'
}

export type LiquidityBookConfig = {
  baseFactor: number
  binStep: number
  activeId: number
  binArraySize: number
  binArrayIndex: number
  maxBasisPoints: number
  filterPeriod: number
  decayPeriod: number
  reductionFactor: number
  variableFeeControl: number
  maxVolatilityAccumulator: number
  protocolShare: number
  startTime: number
  rewardsDuration: number
  rewardsPerSecond: number
}

export interface ILiquidityBookConfig {
  mode: MODE
  liquidBookConfig?: LiquidityBookConfig
  options?: {
    rpcUrl: string
  }
}
