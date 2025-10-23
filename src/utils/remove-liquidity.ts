import { PositionReserve } from '../types';
import { FIXED_LENGTH, RemoveLiquidityType } from '../constants';

export const calculateRemovedShares = (
  reserveXY: PositionReserve[],
  type: RemoveLiquidityType,
  start: number,
  end: number
): { removedShares: bigint[]; shouldClosePosition: boolean } => {
  let removedShares: bigint[] = [];

  if (type === RemoveLiquidityType.All) {
    removedShares = reserveXY.map((reserve: PositionReserve) => {
      const binId = reserve.binId;
      if (binId >= Number(start) && binId <= Number(end)) {
        return reserve.liquidityShare;
      }
      return 0n;
    });
  }

  if (type === RemoveLiquidityType.TokenX) {
    removedShares = reserveXY.map((reserve: PositionReserve) => {
      if (reserve.reserveX > 0n && reserve.reserveY === 0n) {
        return reserve.liquidityShare;
      }
      return 0n;
    });
  }

  if (type === RemoveLiquidityType.TokenY) {
    removedShares = reserveXY.map((reserve: PositionReserve) => {
      if (reserve.reserveY > 0n && reserve.reserveX === 0n) {
        return reserve.liquidityShare;
      }
      return 0n;
    });
  }

  const availableShares = reserveXY.filter((item: PositionReserve) =>
    type === RemoveLiquidityType.All
      ? item.liquidityShare > 0n
      : type === RemoveLiquidityType.TokenY
        ? item.reserveX > 0n
        : item.reserveY > 0n
  );

  const shouldClosePosition =
    (type === RemoveLiquidityType.All && end - start + 1 >= availableShares.length) ||
    (end - start + 1 === FIXED_LENGTH && availableShares.length === FIXED_LENGTH);

  return { removedShares, shouldClosePosition };
};
