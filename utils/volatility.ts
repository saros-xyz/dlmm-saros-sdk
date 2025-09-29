// utils/volatility.ts
import { Pair } from '../types/services';
import { BASIS_POINT_MAX } from '../constants';

export class Volatility {
  private volatilityAccumulator = 0;
  private volatilityReference = 0;
  private timeLastUpdated = 0;
  private referenceId = 0;

  public async updateReferences(
    pairInfo: Pair,
    activeId: number,
    getCurrentSlot: () => Promise<number>,
    getBlockTime: (slot: number) => Promise<number | null>
  ) {
    this.referenceId = pairInfo.dynamicFeeParameters.idReference;
    this.timeLastUpdated = pairInfo.dynamicFeeParameters.timeLastUpdated.toNumber();
    this.volatilityReference = pairInfo.dynamicFeeParameters.volatilityReference;

    const slot = await getCurrentSlot();
    const blockTimeStamp = await getBlockTime(slot);

    if (blockTimeStamp) {
      const timeDelta = blockTimeStamp - this.timeLastUpdated;

      if (timeDelta > pairInfo.staticFeeParameters.filterPeriod) {
        this.referenceId = activeId;

        if (timeDelta >= pairInfo.staticFeeParameters.decayPeriod) {
          this.volatilityReference = 0;
        } else {
          this.updateVolatilityReference(pairInfo);
        }
      }

      this.timeLastUpdated = blockTimeStamp;
    }

    this.updateVolatilityAccumulator(pairInfo, activeId);
  }

  private updateVolatilityReference(pairInfo: Pair) {
    this.volatilityReference =
      (pairInfo.dynamicFeeParameters.volatilityAccumulator * pairInfo.staticFeeParameters.reductionFactor) /
      BASIS_POINT_MAX;
  }

  public updateVolatilityAccumulator(pairInfo: Pair, activeId: number) {
    const deltaId = Math.abs(activeId - this.referenceId);
    const newAccumulator = deltaId * BASIS_POINT_MAX + this.volatilityReference;
    const maxVolatilityAccumulator = pairInfo.staticFeeParameters.maxVolatilityAccumulator;

    this.volatilityAccumulator = Math.min(newAccumulator, maxVolatilityAccumulator);
  }

  public getVolatilityAccumulator() {
    return this.volatilityAccumulator;
  }
}
