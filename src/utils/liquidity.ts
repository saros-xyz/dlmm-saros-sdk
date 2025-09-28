import { BN } from '@coral-xyz/anchor';
import { PositionReserve, RemoveLiquidityType } from '../types';
import { FIXED_LENGTH } from '../constants';

export class LiquidityManager {
  public static calculateRemovedShares(
    reserveXY: PositionReserve[],
    type: RemoveLiquidityType,
    start: number,
    end: number
  ): BN[] {
    let removedShares: BN[] = [];

    if (type === RemoveLiquidityType.All) {
      removedShares = reserveXY.map((reserve: PositionReserve) => {
        const binId = reserve.binId;
        if (binId >= Number(start) && binId <= Number(end)) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.TokenX) {
      removedShares = reserveXY.map((reserve: PositionReserve) => {
        if (reserve.baseReserve > 0n && reserve.quoteReserve === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.TokenY) {
      removedShares = reserveXY.map((reserve: PositionReserve) => {
        if (reserve.quoteReserve > 0n && reserve.baseReserve === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    return removedShares;
  }

  public static getAvailableShares(
    reserveXY: PositionReserve[],
    type: RemoveLiquidityType
  ): PositionReserve[] {
    return reserveXY.filter((item: PositionReserve) =>
      type === RemoveLiquidityType.All
        ? item.liquidityShare > 0n
        : type === RemoveLiquidityType.TokenY
          ? item.baseReserve > 0n
          : item.quoteReserve > 0n
    );
  }

  public static shouldClosePosition(
    type: RemoveLiquidityType,
    start: number,
    end: number,
    availableShares: PositionReserve[]
  ): boolean {
    return (
      (type === RemoveLiquidityType.All && end - start + 1 >= availableShares.length) ||
      (end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH)
    );
  }
}
