import { BN } from '@coral-xyz/anchor';
import { PositionBinReserve, RemoveLiquidityType } from '../../types';
import { FIXED_LENGTH } from '../../constants';

export class LiquidityManager {
  public static calculateRemovedShares(
    reserveXY: PositionBinReserve[],
    type: RemoveLiquidityType,
    start: number,
    end: number
  ): BN[] {
    let removedShares: BN[] = [];

    if (type === RemoveLiquidityType.All) {
      removedShares = reserveXY.map((reserve: PositionBinReserve) => {
        const binId = reserve.binId;
        if (binId >= Number(start) && binId <= Number(end)) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.BaseToken) {
      removedShares = reserveXY.map((reserve: PositionBinReserve) => {
        if (reserve.reserveX > 0n && reserve.reserveY === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.QuoteToken) {
      removedShares = reserveXY.map((reserve: PositionBinReserve) => {
        if (reserve.reserveY > 0n && reserve.reserveX === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    return removedShares;
  }

  public static getAvailableShares(
    reserveXY: PositionBinReserve[],
    type: RemoveLiquidityType
  ): PositionBinReserve[] {
    return reserveXY.filter((item: PositionBinReserve) =>
      type === RemoveLiquidityType.All
        ? item.liquidityShare > 0n
        : type === RemoveLiquidityType.QuoteToken
          ? item.reserveX > 0n
          : item.reserveY > 0n
    );
  }

  public static shouldClosePosition(
    type: RemoveLiquidityType,
    start: number,
    end: number,
    availableShares: PositionBinReserve[]
  ): boolean {
    return (
      (type === RemoveLiquidityType.All && end - start + 1 >= availableShares.length) ||
      (end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH)
    );
  }
}
