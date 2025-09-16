import { BN } from '@coral-xyz/anchor';
import { BinReserveInfo, RemoveLiquidityType } from '../../types';
import { FIXED_LENGTH } from '../../constants';

export class LiquidityHelper {
  public static calculateRemovedShares(
    reserveXY: BinReserveInfo[],
    type: RemoveLiquidityType,
    start: number,
    end: number
  ): BN[] {
    let removedShares: BN[] = [];

    if (type === RemoveLiquidityType.All) {
      removedShares = reserveXY.map((reserve: BinReserveInfo) => {
        const binId = reserve.binId;
        if (binId >= Number(start) && binId <= Number(end)) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.BaseToken) {
      removedShares = reserveXY.map((reserve: BinReserveInfo) => {
        if (reserve.reserveX > 0n && reserve.reserveY === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    if (type === RemoveLiquidityType.QuoteToken) {
      removedShares = reserveXY.map((reserve: BinReserveInfo) => {
        if (reserve.reserveY > 0n && reserve.reserveX === 0n) {
          return new BN(reserve.liquidityShare.toString());
        }
        return new BN(0);
      });
    }

    return removedShares;
  }

  public static getAvailableShares(
    reserveXY: BinReserveInfo[],
    type: RemoveLiquidityType
  ): BinReserveInfo[] {
    return reserveXY.filter((item: BinReserveInfo) =>
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
    availableShares: BinReserveInfo[]
  ): boolean {
    return (
      (type === RemoveLiquidityType.All && end - start + 1 >= availableShares.length) ||
      (end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH)
    );
  }
}
