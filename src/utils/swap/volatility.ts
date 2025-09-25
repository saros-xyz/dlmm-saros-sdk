import { MAX_BASIS_POINTS } from '../../constants';
import { DLMMPairAccount } from '../../types';

export class VolatilityManager {
  private volatilityAccumulator: number = 0;
  private volatilityReference: number = 0;
  private timeLastUpdated: number = 0;
  private referenceId: number = 0;

  public async updateReferences(
    pairInfo: DLMMPairAccount,
    activeId: number,
    getCurrentSlot: () => Promise<number>,
    getBlockTime: (slot: number) => Promise<number | null>
  ): Promise<void> {
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

  public updateVolatilityReference(pairInfo: DLMMPairAccount): void {
    this.volatilityReference =
      (pairInfo.dynamicFeeParameters.volatilityAccumulator *
        pairInfo.staticFeeParameters.reductionFactor) /
      MAX_BASIS_POINTS;
  }

  public updateVolatilityAccumulator(pairInfo: DLMMPairAccount, activeId: number): void {
    const deltaId = Math.abs(activeId - this.referenceId);
    const volatilityAccumulator = deltaId * MAX_BASIS_POINTS + this.volatilityReference;

    const maxVolatilityAccumulator = pairInfo.staticFeeParameters.maxVolatilityAccumulator;

    if (volatilityAccumulator > maxVolatilityAccumulator) {
      this.volatilityAccumulator = maxVolatilityAccumulator;
    } else {
      this.volatilityAccumulator = volatilityAccumulator;
    }
  }

  public getVolatilityAccumulator(): number {
    return this.volatilityAccumulator;
  }
}
