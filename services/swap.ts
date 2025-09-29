import { BN, Idl, Program, utils } from '@coral-xyz/anchor';
import { BinArrayAccount } from '../types';

import { Connection, PublicKey } from '@solana/web3.js';
import { BIN_ARRAY_SIZE, MAX_BIN_CROSSINGS, SCALE_OFFSET } from '../constants';
import { GetBinArrayParams, GetTokenOutputParams, Pair } from '../types/services';
import { calcAmountInByPrice, calcAmountOutByPrice, getPriceFromId } from '../utils/price';
import { Volatility } from '../utils/volatility';
import { getFeeAmount, getFeeForAmount, getProtocolFee, getTotalFee } from '../utils/fees';
import { BinArrayRange } from '../utils/bin-range';

export class LBSwapService {
  lbProgram!: Program<Idl>;
  private volatility: Volatility;
  connection: Connection;

  constructor(lbProgram: Program<Idl>, connection: Connection) {
    this.lbProgram = lbProgram;
    this.connection = connection;
    this.volatility = new Volatility();
  }

  static fromLbConfig(lbProgram: Program<Idl>, connection: Connection) {
    return new LBSwapService(lbProgram, connection);
  }

  getBinArray(params: GetBinArrayParams) {
    const { binArrayIndex, pair } = params;

    const binArray = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode('bin_array')),
        pair.toBuffer(),
        new BN(binArrayIndex).toArrayLike(Buffer, 'le', 4),
      ],
      this.lbProgram.programId
    )[0];

    return binArray;
  }

  public async calculateInOutAmount(params: GetTokenOutputParams) {
    const { amount, swapForY, pair, isExactInput } = params;
    try {
      //@ts-ignore
      const pairInfo: Pair = await this.lbProgram.account.pair.fetch(pair);
      if (!pairInfo) throw new Error('Pair not found');

      const currentBinArrayIndex = Math.floor(pairInfo.activeId / BIN_ARRAY_SIZE);
      const binArrayIndexes = [currentBinArrayIndex - 1, currentBinArrayIndex, currentBinArrayIndex + 1];
      const binArrayAddresses = binArrayIndexes.map((idx) =>
        this.getBinArray({
          binArrayIndex: idx,
          pair,
        })
      );

      // Fetch bin arrays in batch, fallback to empty if not found
      const binArrays: BinArrayAccount[] = await Promise.all(
        binArrayAddresses.map((address, i) =>
          //@ts-ignore
          this.lbProgram.account.binArray.fetch(address).catch((_error: any) => {
            return { index: binArrayIndexes[i], bins: [] } as BinArrayAccount;
          })
        )
      );

      // Validate bin arrays and build range
      const binRange = new BinArrayRange(binArrays[0], binArrays[1], binArrays[2]);
      const totalSupply = binRange.getAllBins().reduce((acc, cur) => acc.add(cur.totalSupply), new BN(0));
      if (totalSupply.isZero()) {
        return {
          amountIn: BigInt(0),
          amountOut: BigInt(0),
        };
      }

      const amountAfterTransferFee = amount;

      if (isExactInput) {
        const amountOut = await this.calculateAmountOut(amountAfterTransferFee, binRange, pairInfo, swapForY);

        return {
          amountIn: amount,
          amountOut,
        };
      } else {
        const amountIn = await this.calculateAmountIn(amountAfterTransferFee, binRange, pairInfo, swapForY);

        return {
          amountIn,
          amountOut: amountAfterTransferFee,
        };
      }
    } catch (error) {
      throw new Error(error as string);
    }
  }

  /**
   * @description Calculate the input amount for the swap. isExactInput = false
   */
  public async calculateAmountIn(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean) {
    try {
      let amountIn = BigInt(0);
      // UNUSED TODO: INVESTIGATE
      // is assigned a value but never used
      // let totalProtocolFee = BigInt(0);
      let amountOutLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatility.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountOutLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatility.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBin(activeId);
        if (!activeBin) {
          break;
        }

        const vol = this.volatility.getVolatilityAccumulator();
        const fee = getTotalFee(pairInfo, vol);

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          // protocolFeeAmount,
        } = this.swapExactOutput({
          binStep: pairInfo.binStep,
          activeId,
          amountOutLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
        });

        amountIn += amountInWithFees;
        amountOutLeft -= amountOutOfBin;
        // totalProtocolFee += protocolFeeAmount;

        if (!amountOutLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }

      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw new Error('Quote Failed: Swap crosses too many bins');
      }

      return amountIn;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @description Calculate the output amount for the swap. isExactInput = true
   */
  public async calculateAmountOut(amount: bigint, bins: BinArrayRange, pairInfo: Pair, swapForY: boolean) {
    try {
      let amountOut = BigInt(0);
      // TODO: INVESTIGATE
      // totalProtocolFee is never used
      // let totalProtocolFee = BigInt(0);
      let amountInLeft = amount;
      let activeId = pairInfo.activeId;
      let totalBinUsed = 0;

      await this.volatility.updateReferences(
        pairInfo,
        activeId,
        () => this.connection.getSlot(),
        (slot) => this.connection.getBlockTime(slot)
      );

      while (amountInLeft > BigInt(0)) {
        totalBinUsed++;
        this.volatility.updateVolatilityAccumulator(pairInfo, activeId);

        const activeBin = bins.getBin(activeId);
        if (!activeBin) {
          break;
        }

        const vol = this.volatility.getVolatilityAccumulator();
        const fee = getTotalFee(pairInfo, vol);

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          // protocolFeeAmount,
        } = this.swapExactInput({
          binStep: pairInfo.binStep,
          activeId,
          amountInLeft,
          fee,
          protocolShare: pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          reserveX: activeBin.reserveX,
          reserveY: activeBin.reserveY,
        });

        amountOut += amountOutOfBin;
        amountInLeft -= amountInWithFees;
        // totalProtocolFee += protocolFeeAmount;

        if (!amountInLeft) break;
        activeId = this.moveActiveId(activeId, swapForY);
      }
      if (totalBinUsed >= MAX_BIN_CROSSINGS) {
        throw new Error('Quote Failed: Swap crosses too many bins');
      }

      return amountOut;
    } catch (error) {
      throw error;
    }
  }

  public swapExactOutput(params: {
    binStep: number;
    activeId: number;
    amountOutLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountOutLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0),
      };
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());
    const amountOut = amountOutLeft > binReserveOutBigInt ? binReserveOutBigInt : amountOutLeft;

    /** @notice assume base token and quote token have the same decimals to get the price */
    const price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    const amountInWithoutFee = calcAmountInByPrice(amountOut, priceScaled, SCALE_OFFSET, swapForY, 'up');

    const feeAmount = getFeeForAmount(amountInWithoutFee, fee);
    const amountIn = amountInWithoutFee + feeAmount;
    const protocolFeeAmount = getProtocolFee(feeAmount, protocolShareBigInt);

    return {
      amountInWithFees: amountIn,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  public swapExactInput(params: {
    binStep: number;
    activeId: number;
    amountInLeft: bigint;
    fee: bigint;
    protocolShare: number;
    swapForY: boolean;
    reserveX: BN;
    reserveY: BN;
  }) {
    const { binStep, activeId, amountInLeft, protocolShare, swapForY, reserveX, reserveY, fee } = params;
    const protocolShareBigInt = BigInt(protocolShare);
    const binReserveOut = swapForY ? reserveY : reserveX;

    if (binReserveOut.isZero()) {
      return {
        amountInWithFees: BigInt(0),
        amountOut: BigInt(0),
        feeAmount: BigInt(0),
        protocolFeeAmount: BigInt(0),
      };
    }

    const binReserveOutBigInt = BigInt(binReserveOut.toString());

    /** @notice assume base token and quote token have the same decimals to get the price */
    const price = getPriceFromId(binStep, activeId, 9, 9);
    // Encode price as bigint with SCALE_OFFSET
    const priceScaled = BigInt(Math.round(Number(price) * Math.pow(2, SCALE_OFFSET)));

    // Calculate maxAmountIn (input needed to take all output in bin, before fee)
    let maxAmountIn = calcAmountInByPrice(binReserveOutBigInt, priceScaled, SCALE_OFFSET, swapForY, 'up');

    // Add fee to get total input needed (ceil)
    const maxFeeAmount = getFeeForAmount(maxAmountIn, fee);
    maxAmountIn += maxFeeAmount;

    let amountOut = BigInt(0);
    let amountIn = BigInt(0);
    let feeAmount = BigInt(0);

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount;
      amountIn = maxAmountIn - feeAmount;
      amountOut = binReserveOutBigInt;
    } else {
      feeAmount = getFeeAmount(amountInLeft, fee);
      amountIn = amountInLeft - feeAmount;
      amountOut = calcAmountOutByPrice(amountIn, priceScaled, SCALE_OFFSET, swapForY, 'down');
      if (amountOut > binReserveOutBigInt) {
        amountOut = binReserveOutBigInt;
      }
    }

    const protocolFeeAmount = protocolShare > BigInt(0) ? getProtocolFee(feeAmount, protocolShareBigInt) : BigInt(0);

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount,
    };
  }

  public moveActiveId(pairId: number, swapForY: boolean) {
    if (swapForY) {
      return pairId - 1;
    } else {
      return pairId + 1;
    }
  }
}
