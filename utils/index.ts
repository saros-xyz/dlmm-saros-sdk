import { Connection } from "@solana/web3.js";
import {
  ACTIVE_ID,
  BIN_ARRAY_SIZE,
  FIXED_LENGTH,
  MAX_BASIS_POINTS,
  UNIT_PRICE_DEFAULT,
} from "../constants/config";
import { Distribution, LiquidityShape, PositionInfo } from "../types/services";
import { divRem } from "./math";

interface CreateLiquidityDistributionParams {
  shape: LiquidityShape;
  binRange: [number, number];
}

const getCurveDistributionFromBinRange = (binRange: number[]) => {
  const activeId = 0;

  // init return values
  let deltaIds: number[] = [],
    _distributionX: number[] = [],
    _distributionY: number[] = [];

  // get sigma based on radius R
  const getSigma = (_R: number) => {
    const factor =
      _R >= 20
        ? 2.0
        : _R >= 15
        ? 1.8
        : _R >= 10
        ? 1.7
        : _R >= 8
        ? 1.6
        : _R >= 6
        ? 1.5
        : _R >= 5
        ? 1.4
        : 1.0;
    return _R / factor;
  };

  // range only includes B tokens (Y tokens)
  if (binRange[1] < activeId) {
    const negDelta = binRange[1] - binRange[0] + 1;
    const negativeDeltaIds = Array.from(Array(activeId - binRange[0]).keys())
      .reverse()
      .slice(0, negDelta)
      .map((el) => -1 * (el + 1));

    deltaIds = [...negativeDeltaIds];
    if (activeId === binRange[1]) {
      deltaIds.push(0);
    }

    _distributionX = [...Array(deltaIds.length).fill(0)];

    // radius is num of bins
    const R = deltaIds.length - 1;
    const sigma = getSigma(R);

    // A = 1 / (sigma  * sqrt(2 * pi))
    const A = 1 / (Math.sqrt(Math.PI * 2) * sigma);

    // dist = 2 * A * exp(-0.5 * (r /sigma) ^ 2)
    // r is distance from right-most bin
    _distributionY = deltaIds.map(
      (_, ind) => 2 * A * Math.exp(-0.5 * Math.pow((R - ind) / sigma, 2))
    );
  }

  // range only includes A tokens (X tokens)
  else if (activeId < binRange[0]) {
    const posDelta = binRange[1] - binRange[0] + 1;
    const positiveDeltaIds = Array.from(Array(binRange[1] - activeId).keys())
      .reverse()
      .slice(0, posDelta)
      .reverse()
      .map((el) => el + 1);

    deltaIds = [...positiveDeltaIds];
    if (activeId === binRange[0]) {
      deltaIds.unshift(0);
    }

    _distributionY = [...Array(deltaIds.length).fill(0)];

    // radius is num of bins
    const R = deltaIds.length - 1;
    const sigma = getSigma(R);

    // A = 1 / (sigma  * sqrt(2 * pi))
    const A = 1 / (Math.sqrt(Math.PI * 2) * sigma);

    // dist = 2 * A * exp(-0.5 * (r /sigma) ^ 2)
    // r is distance from left-most bin
    _distributionX = deltaIds.map(
      (_, ind) => 2 * A * Math.exp(-0.5 * Math.pow(ind / sigma, 2))
    );
  }

  // range includes both X and Y tokens
  else {
    const negDelta = activeId - binRange[0];
    const posDelta = binRange[1] - activeId;

    const negativeDeltaIds = Array.from(Array(negDelta).keys())
      .reverse()
      .map((el) => -1 * (el + 1));
    const positiveDeltaIds = Array.from(Array(posDelta).keys()).map(
      (el) => el + 1
    );
    deltaIds = [...negativeDeltaIds, 0, ...positiveDeltaIds];

    // radius is num of bins
    const RX = positiveDeltaIds.length;
    const sigmaX = getSigma(RX);

    // A = 1 / (sigma  * sqrt(2 * pi))
    const AX = RX === 0 ? 1 : 1 / (Math.sqrt(Math.PI * 2) * sigmaX);

    // dist = 2 * A * exp(-0.5 * (r /sigma) ^ 2)
    // r is distance from 0
    _distributionX = [
      ...Array(negDelta).fill(0),
      AX,
      ...positiveDeltaIds.map(
        (_, ind) => 2 * AX * Math.exp(-0.5 * Math.pow((ind + 1) / sigmaX, 2))
      ),
    ];

    // radius is num of bins
    const RY = negativeDeltaIds.length;
    const sigmaY = getSigma(RY);

    // A = 1 / (sigma  * sqrt(2 * pi))
    const AY = RY === 0 ? 1 : 1 / (Math.sqrt(Math.PI * 2) * sigmaY);

    // dist = 2 * A * exp(-0.5 * (r /sigma) ^ 2)
    // r is distance from 0
    _distributionY = [
      ...negativeDeltaIds.map(
        (_, ind) => 2 * AY * Math.exp(-0.5 * Math.pow((RY - ind) / sigmaY, 2))
      ),
      AY,
      ...Array(posDelta).fill(0),
    ];
  }

  let liquidityDistributionX = _distributionX.map((i) =>
    Math.floor(i * MAX_BASIS_POINTS)
  );

  let liquidityDistributionY = _distributionY.map((i) =>
    Math.floor(i * MAX_BASIS_POINTS)
  );

  // check totalX and totalY with MAX_BASIS_POINTS
  const totalX = liquidityDistributionX.reduce((acc, val) => acc + val, 0);

  const totalY = liquidityDistributionY.reduce((acc, val) => acc + val, 0);

  if (totalX > 0 && totalX !== MAX_BASIS_POINTS) {
    const isOverflow = totalX > MAX_BASIS_POINTS;
    const overPoint = Math.abs(totalX - MAX_BASIS_POINTS);
    const numberBins = liquidityDistributionX.filter((i) => i > 0).length;
    const [quotient, remainder] = divRem(overPoint, numberBins);

    liquidityDistributionX = liquidityDistributionX.map((i) => {
      if (i === 0) return i;
      return isOverflow ? i - Math.floor(quotient) : i + Math.floor(quotient);
    });
    let remainderLeft = remainder;
    if (remainder > 0) {
      if (!isOverflow) {
        liquidityDistributionX = liquidityDistributionX.map((i) => {
          if (i === 0) return i;
          if (remainderLeft > 0) {
            remainderLeft--;
            return i + 1;
          }
          return i;
        });
      } else {
        const reverseLiquid = liquidityDistributionX.reverse().map((i) => {
          if (i === 0) return i;
          if (remainderLeft > 0) {
            remainderLeft--;
            return i - 1;
          }
          return i;
        });
        liquidityDistributionX = reverseLiquid.reverse();
      }
    }
  }

  if (totalY > 0 && totalY !== MAX_BASIS_POINTS) {
    const isOverflow = totalY > MAX_BASIS_POINTS;
    const overPoint = Math.abs(totalY - MAX_BASIS_POINTS);
    const numberBins = liquidityDistributionY.filter((i) => i > 0).length;
    const [quotient, remainder] = divRem(overPoint, numberBins);

    liquidityDistributionY = liquidityDistributionY.map((i, idx) => {
      if (i === 0) return i;
      if (remainder > 0 && idx === numberBins - 1) {
        return isOverflow
          ? i - Math.floor(quotient) - remainder
          : i + Math.floor(quotient) + remainder;
      }
      return isOverflow ? i - Math.floor(quotient) : i + Math.floor(quotient);
    });
  }

  //return
  const liquidityDistribution = deltaIds.map((i, idx) => {
    return {
      relativeBinId: i,
      distributionX: liquidityDistributionX[idx],
      distributionY: liquidityDistributionY[idx],
    };
  });
  return liquidityDistribution;
};

export function createUniformDistribution(
  params: CreateLiquidityDistributionParams
): Distribution[] {
  const { shape, binRange } = params;

  const [minBin, maxBin] = binRange;

  if (minBin > maxBin) {
    throw new Error("Invalid binRange: minBin must be <= maxBin");
  }

  const relativeIds = Array.from(
    { length: maxBin - minBin + 1 },
    (_, i) => i + minBin
  );

  if (shape === LiquidityShape.Spot) {
    const totalArrayLength = maxBin - minBin + 1;
    const findActiveBinIndex = relativeIds.findIndex((item) => item === 0);

    if (findActiveBinIndex === -1) {
      const isOnlyX = minBin > 0;
      const isOnlyY = maxBin < 0;
      const distribution = MAX_BASIS_POINTS / totalArrayLength;

      return relativeIds.map((x) => ({
        relativeBinId: x,
        distributionX: isOnlyX ? distribution : 0,
        distributionY: isOnlyY ? distribution : 0,
      }));
    }

    const totalYBin = Math.abs(minBin);
    const totalXBin = maxBin;

    const distributionX = Array.from({ length: totalArrayLength }, (_, i) => {
      if (i < findActiveBinIndex) return 0;
      const pricePerBin = Math.floor(
        (2 * MAX_BASIS_POINTS) / (totalXBin * 2 + 1)
      );
      if (i === findActiveBinIndex)
        return MAX_BASIS_POINTS - pricePerBin * totalXBin;
      return pricePerBin;
    });

    const distributionY = Array.from({ length: totalArrayLength }, (_, i) => {
      if (i > findActiveBinIndex) return 0;
      const pricePerBin = Math.floor(
        (2 * MAX_BASIS_POINTS) / (totalYBin * 2 + 1)
      );
      if (i === findActiveBinIndex)
        return MAX_BASIS_POINTS - pricePerBin * totalYBin;
      return pricePerBin;
    });

    return relativeIds.map((x, i) => ({
      relativeBinId: x,
      distributionX: distributionX[i],
      distributionY: distributionY[i],
    }));
  }

  if (shape === LiquidityShape.Curve) {
    return getCurveDistributionFromBinRange(binRange);
  }

  if (shape === LiquidityShape.BidAsk) {
    //MAX_BASIS_POINTS = 10000
    //binRange = [min, max]
    //activeid = 0

    const activeBin = 0;

    let _distributionY: number[] = [];

    let _distributionX: number[] = [];

    let deltaIds: number[] = [];

    if (maxBin < activeBin) {
      const negDelta = maxBin - minBin + 1;
      const negativeDeltaIds = Array.from(Array(activeBin - minBin).keys())
        .reverse()
        .slice(0, negDelta)
        .map((el) => -1 * (el + 1));

      deltaIds = [...negativeDeltaIds];

      _distributionX = [...Array(deltaIds.length).fill(0)];

      // dist = 2/R^2 * r
      const rSquare = Math.pow(deltaIds[0], 2);
      _distributionY = deltaIds.map((i) => ((i - 1) * -2) / rSquare);
    } else if (activeBin < minBin) {
      const posDelta = binRange[1] - binRange[0] + 1;
      const positiveDeltaIds = Array.from(Array(binRange[1] - activeBin).keys())
        .reverse()
        .slice(0, posDelta)
        .reverse()
        .map((el) => el + 1);

      deltaIds = [...positiveDeltaIds];
      // dist = 2/R^2 * i
      const rSquare = Math.pow(deltaIds[deltaIds.length - 1], 2);
      _distributionX = deltaIds.map((i) => ((i + 1) * 2) / rSquare);
      _distributionY = [...Array(deltaIds.length).fill(0)];
    } else {
      const negDelta = activeBin - binRange[0];
      const posDelta = binRange[1] - activeBin;

      const negativeDeltaIds = Array.from(Array(negDelta).keys())
        .reverse()
        .map((el) => -1 * (el + 1));
      const positiveDeltaIds = Array.from(Array(posDelta).keys()).map(
        (el) => el + 1
      );

      deltaIds = [...negativeDeltaIds, 0, ...positiveDeltaIds];

      // dist = 1/R^2 * i
      const rSquareX =
        positiveDeltaIds.length === 0
          ? 1
          : positiveDeltaIds.length === 1 && positiveDeltaIds[0] === 1
          ? 3
          : Math.pow(positiveDeltaIds[positiveDeltaIds.length - 1], 2);
      _distributionX = [
        ...Array(negDelta).fill(0),
        1 / rSquareX,
        ...positiveDeltaIds.map((i) => (i + 1) / rSquareX),
      ];

      // dist = 1/R^2 * i
      const rSquareY =
        negativeDeltaIds.length === 0
          ? 1
          : negativeDeltaIds[0] === -1
          ? 3
          : Math.pow(negativeDeltaIds[0], 2);
      _distributionY = [
        ...negativeDeltaIds.map((i) => (-1 * (i - 1)) / rSquareY),
        1 / rSquareY,
        ...Array(posDelta).fill(0),
      ];
    }

    let liquidityDistributionX = _distributionX.map((i) => {
      return Math.floor(i * MAX_BASIS_POINTS);
    });

    let liquidityDistributionY = _distributionY.map((i) => {
      return Math.floor(i * MAX_BASIS_POINTS);
    });

    // check totalX and totalY with MAX_BASIS_POINTS
    const totalX = liquidityDistributionX.reduce((acc, val) => acc + val, 0);

    const totalY = liquidityDistributionY.reduce((acc, val) => acc + val, 0);

    if (totalX > 0 && totalX !== MAX_BASIS_POINTS) {
      const isOverflow = totalX > MAX_BASIS_POINTS;
      const overPoint = Math.abs(totalX - MAX_BASIS_POINTS);
      const numberBins = liquidityDistributionX.filter((i) => i > 0).length;
      const [quotient, remainder] = divRem(overPoint, numberBins);

      liquidityDistributionX = liquidityDistributionX.map((i) => {
        if (i === 0) return i;
        return isOverflow ? i - Math.floor(quotient) : i + Math.floor(quotient);
      });
      let remainderLeft = remainder;
      if (remainder > 0) {
        if (!isOverflow) {
          liquidityDistributionX = liquidityDistributionX.map((i) => {
            if (i === 0) return i;
            if (remainderLeft > 0) {
              remainderLeft--;
              return i + 1;
            }
            return i;
          });
        } else {
          const reverseLiquid = liquidityDistributionX.reverse().map((i) => {
            if (i === 0) return i;
            if (remainderLeft > 0) {
              remainderLeft--;
              return i - 1;
            }
            return i;
          });
          liquidityDistributionX = reverseLiquid.reverse();
        }
      }
    }

    if (totalY > 0 && totalY !== MAX_BASIS_POINTS) {
      const isOverflow = totalY > MAX_BASIS_POINTS;
      const overPoint = Math.abs(totalY - MAX_BASIS_POINTS);
      const numberBins = liquidityDistributionY.filter((i) => i > 0).length;
      const [quotient, remainder] = divRem(overPoint, numberBins);

      liquidityDistributionY = liquidityDistributionY.map((i, idx) => {
        if (i === 0) return i;
        if (remainder > 0 && idx === 0) {
          return isOverflow
            ? i - Math.floor(quotient) - remainder
            : i + Math.floor(quotient) + remainder;
        }
        return isOverflow ? i - Math.floor(quotient) : i + Math.floor(quotient);
      });
    }

    const liquidityDistribution = deltaIds.map((i, idx) => {
      return {
        relativeBinId: i,
        distributionX: liquidityDistributionX[idx],
        distributionY: liquidityDistributionY[idx],
      };
    });

    return liquidityDistribution;
  }

  throw new Error(`Unsupported liquidity shape: ${shape}`);
}

export const getMaxPosition = (range: [number, number], activeId: number) => {
  const leftRangeIndex = Math.floor(activeId / 16);
  const rangeFromIndex = [
    Math.floor((activeId + range[0]) / 16),
    Math.floor((activeId + range[1]) / 16),
  ];

  const positions = Array.from(
    { length: rangeFromIndex[1] - rangeFromIndex[0] + 1 },
    (_, index) => {
      return rangeFromIndex[0] + index - leftRangeIndex;
    }
  );

  return positions;
};

export const getMaxBinArray = (range: [number, number], activeId: number) => {
  const arrayIndex = [activeId + range[0], activeId + range[1]];

  const binIndex = [
    Math.floor(arrayIndex[0] / BIN_ARRAY_SIZE),
    Math.floor(arrayIndex[1] / BIN_ARRAY_SIZE),
  ];

  // check if binArrayLower, binArrayUpper is the same
  if (binIndex[1] === binIndex[0]) {
    binIndex[1] += 1;
  }

  const binArrayIndexLen = binIndex[1] - binIndex[0] - 1;
  const binArrayList = Array.from({ length: binArrayIndexLen + 1 }, (_, i) => {
    const index = binIndex[0] + i * 2;
    return {
      binArrayLowerIndex: index,
      binArrayUpperIndex: index + 1,
    };
  });

  return binArrayList;
};

export const getBinRange = (index: number, activeId: number) => {
  const firstBinId = Math.floor(activeId % 16);

  const firstArray = [-firstBinId, -firstBinId + 16 - 1];
  const range = [
    firstArray[0] + index * FIXED_LENGTH,
    firstArray[1] + index * FIXED_LENGTH,
  ];
  return {
    range,
    binLower: activeId + range[0],
    binUpper: activeId + range[1] - 1,
  };
};

export const findPosition = (index: number, activeBin = ACTIVE_ID) => (
  position: PositionInfo
) => {
  const { binLower, binUpper } = getBinRange(index, activeBin);

  return position.lowerBinId <= binLower && position.upperBinId >= binUpper;
};

export const getGasPrice = async (connection: Connection): Promise<number> => {
  const buffNum = 100;
  try {
    return await new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve(UNIT_PRICE_DEFAULT * buffNum);
      }, 2000);
      const getPriority = await connection.getRecentPrioritizationFees();
      const currentFee = getPriority
        .filter((fee) => fee?.prioritizationFee > 0)
        .map((fee) => fee?.prioritizationFee);
      clearTimeout(timeout);
      const unitPrice =
        currentFee.length > 0
          ? Math.max(...currentFee, UNIT_PRICE_DEFAULT)
          : UNIT_PRICE_DEFAULT;
      resolve(unitPrice * buffNum);
    });
  } catch {
    return UNIT_PRICE_DEFAULT * buffNum;
  }
};