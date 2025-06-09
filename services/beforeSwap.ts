import { BN, Idl, Program } from '@coral-xyz/anchor'
import { BinArray, GetTokenOutputParams, Pair } from '../types/services'
import {
  BASIS_POINT_MAX,
  BIN_ARRAY_SIZE,
  MAX_BASIS_POINTS,
  PRECISION,
  SCALE_OFFSET,
  VARIABLE_FEE_PRECISION
} from '../constants/config'
import { mulShr, shlDiv } from '../utils/math'
import { getPriceFromId } from '../utils/price'

export class LBError extends Error {
  static BinNotFound = new LBError('Bin not found')
  static BinArrayIndexMismatch = new LBError('Bin array index mismatch')

  constructor(message: string) {
    super(message)
    this.name = 'LBError'
  }
}

export class BinArrayPair {
  constructor(public binArrayLower: BinArray, public binArrayUpper: BinArray) {
    if (binArrayUpper.index !== binArrayLower.index + 1) {
      throw LBError.BinArrayIndexMismatch
    }
  }

  getBinMut(binId: number) {
    if (binId > this.binArrayUpper.index * 256) {
      return this.binArrayUpper.bins[binId % BIN_ARRAY_SIZE]
    }
    return this.binArrayLower.bins[binId % BIN_ARRAY_SIZE]
    // if (this.binArrayLower.bins[binId % BIN_ARRAY_SIZE]) {
    //   return this.binArrayLower.bins[binId % BIN_ARRAY_SIZE]
    // } else {
    //   return this.binArrayUpper.bins[binId % BIN_ARRAY_SIZE]
    // }
  }
}

export class SwapServices {
  lbProgram!: Program<Idl>

  constructor(lbProgram: Program<Idl>) {
    this.lbProgram = lbProgram
  }

  static fromLbConfig(lbProgram: Program<Idl>) {
    return new SwapServices(lbProgram)
  }

  public async calulateInOutAmount(params: GetTokenOutputParams) {
    const {
      amount,
      swapForY,
      binArrayLower,
      binArrayUpper,
      pair,
      isExactInput,
      tokenBaseDecimal,
      tokenQuoteDecimal
    } = params
    try {
      //@ts-expect-error abc
      const pairInfo = await this.lbProgram.account.pair.fetch(pair)
      //@ts-expect-error abc
      const binArrayLowerInfo = await this.lbProgram.account.binArray.fetch(
        binArrayLower
      )
      //@ts-expect-error abc
      const binArrayUpperInfo = await this.lbProgram.account.binArray.fetch(
        binArrayUpper
      )

      const bins = new BinArrayPair(binArrayLowerInfo, binArrayUpperInfo)

      const isTotalSupplyIsZero = [
        ...binArrayLowerInfo.bins,
        ...binArrayUpperInfo.bins
      ].every((item) => item.totalSupply.eq(new BN(0)))

      if (isTotalSupplyIsZero) return undefined
      const amountAfterTransferFee = amount

      if (isExactInput) {
        const { amountOut } = await this.swapManager(
          isExactInput,
          amountAfterTransferFee,
          bins,
          pairInfo,
          swapForY,
          tokenBaseDecimal,
          tokenQuoteDecimal
        )

        return {
          tokenIn: {
            amount,
            decimals: tokenBaseDecimal,
            address: swapForY
              ? params.tokenBase.toString()
              : params.tokenQuote.toString()
          },
          tokenOut: {
            amount: amountOut,
            decimals: tokenQuoteDecimal,
            address: swapForY
              ? params.tokenQuote.toString()
              : params.tokenBase.toString()
          }
        }
      } else {
        const { amountIn } = await this.swapManager(
          isExactInput,
          amountAfterTransferFee,
          bins,
          pairInfo,
          swapForY,
          tokenBaseDecimal,
          tokenQuoteDecimal
        )

        return {
          tokenIn: {
            amount: amountIn,
            address: swapForY
              ? params.tokenBase.toString()
              : params.tokenQuote.toString()
          },
          tokenOut: {
            amount,
            address: swapForY
              ? params.tokenQuote.toString()
              : params.tokenBase.toString()
          }
        }
      }
    } catch (error) {
      throw new Error(error as string)
    }
  }

  public async swapManager(
    isExactInput: boolean,
    amount: number,
    bins: BinArrayPair,
    pairInfo: Pair,
    swapForY: boolean,
    tokenBaseDecimal: number,
    tokenQuoteDecimal: number
  ) {
    let activeId = pairInfo.activeId
    let totalProtocolFee = 0

    if (isExactInput) {
      let amountInLeft = amount
      let amountOut = 0

      while (amountInLeft > 0) {
        const activeBin = bins.getBinMut(activeId)
        if (
          activeId > (bins.binArrayUpper.index + 1) * 256 ||
          activeId < bins.binArrayLower.index * 256
        ) {
          break
        }

        const fee = this.getTotalFee(pairInfo, activeId)

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          protocolFeeAmount
        } = this.swapExactInput(
          pairInfo.binStep,
          activeId,
          amountInLeft,
          fee,
          pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          +BigInt(activeBin.reserveX).toString(),
          +BigInt(activeBin.reserveY).toString(),
          tokenBaseDecimal,
          tokenQuoteDecimal
        )

        amountOut += amountOutOfBin as number
        amountInLeft -= amountInWithFees
        totalProtocolFee += protocolFeeAmount

        if (!amountInLeft) break
        activeId = this.moveActiveId(activeId, swapForY)
      }

      return { amountOut }
    } else {
      let amountOutLeft = amount
      let amountIn = 0

      while (amountOutLeft > 0) {
        if (
          activeId > (bins.binArrayUpper.index + 1) * 256 ||
          activeId < bins.binArrayLower.index * 256
        ) {
          break
        }
        const activeBin = bins.getBinMut(activeId)

        const fee = this.getTotalFee(pairInfo, activeId)

        const {
          amountInWithFees,
          amountOut: amountOutOfBin,
          protocolFeeAmount
        } = this.swapExactOutput(
          pairInfo.binStep,
          activeId,
          amountOutLeft,
          fee,
          pairInfo.staticFeeParameters.protocolShare,
          swapForY,
          +BigInt(activeBin.reserveX).toString(),
          +BigInt(activeBin.reserveY).toString(),
          tokenBaseDecimal,
          tokenQuoteDecimal
        )

        amountIn += amountInWithFees
        amountOutLeft -= amountOutOfBin
        totalProtocolFee += protocolFeeAmount

        if (!amountOutLeft) break
        activeId = this.moveActiveId(activeId, swapForY)
      }

      return { amountIn }
    }
  }

  public swapExactOutput(
    binStep: number,
    activeId: number,
    amountOutLeft: number,
    fee: number,
    protocolShare: number,
    swapForY: boolean,
    reserveX: number,
    reserveY: number,
    tokenBaseDecimal: number,
    tokenQuoteDecimal: number
  ) {
    const price = getPriceFromId(
      binStep,
      activeId,
      tokenBaseDecimal,
      tokenQuoteDecimal
    )
    const binReserveOut = swapForY ? reserveY : reserveX

    if (!binReserveOut)
      return {
        amountInWithFees: 0,
        amountOut: 0,
        feeAmount: 0,
        protocolFeeAmount: 0
      }

    const amountOut = Math.min(amountOutLeft, binReserveOut)
    const amountInWithoutFee = swapForY
      ? shlDiv(amountOut, price, SCALE_OFFSET, 'up')
      : mulShr(amountOut, price, SCALE_OFFSET, 'up')

    const feeAmount = this.getFeeForAmount(amountInWithoutFee as number, fee)
    const amountIn = (amountInWithoutFee as number) + feeAmount
    const protocolFeeAmount = this.getProtocolFee(feeAmount, protocolShare)

    return {
      amountInWithFees: amountIn,
      amountOut,
      feeAmount,
      protocolFeeAmount
    }
  }

  public swapExactInput(
    binStep: number,
    activeId: number,
    amountInLeft: number,
    fee: number,
    protocolShare: number,
    swapForY: boolean,
    reserveX: number,
    reserveY: number,
    tokenBaseDecimal: number = 9,
    tokenQuoteDecimal: number = 9
  ) {
    const price = getPriceFromId(
      binStep,
      activeId,
      tokenBaseDecimal,
      tokenQuoteDecimal
    )
    const binReserveOut = swapForY ? reserveY : reserveX
    if (!binReserveOut)
      return {
        amountInWithFees: 0,
        amountOut: 0,
        feeAmount: 0,
        protocolFeeAmount: 0
      }

    let maxAmountIn = swapForY
      ? (shlDiv(reserveY, price, SCALE_OFFSET, 'up') as number)
      : (mulShr(reserveX, price, SCALE_OFFSET, 'up') as number)
    const maxFeeAmount = this.getFeeForAmount(maxAmountIn, fee)
    maxAmountIn += maxFeeAmount

    let amountOut, amountIn, feeAmount

    if (amountInLeft >= maxAmountIn) {
      feeAmount = maxFeeAmount
      amountIn = maxAmountIn - feeAmount
      amountOut = binReserveOut
    } else {
      feeAmount = this.getFeeAmount(amountInLeft, fee)
      amountIn = amountInLeft - feeAmount
      amountOut = swapForY
        ? mulShr(amountIn, price, SCALE_OFFSET, 'down')
        : shlDiv(amountIn, price, SCALE_OFFSET, 'down')
      if (amountOut && (amountOut as number) > binReserveOut) {
        amountOut = binReserveOut
      }
    }

    const protocolFeeAmount =
      protocolShare > 0 ? this.getProtocolFee(feeAmount, protocolShare) : 0

    return {
      amountInWithFees: amountIn + feeAmount,
      amountOut,
      feeAmount,
      protocolFeeAmount
    }
  }


  public getVolatilityAccumulator(pairInfo: Pair, activeId: number) {
    const deltaId = Math.abs(
      activeId - pairInfo.dynamicFeeParameters.idReference
    )
    const volatilityAccumulator =
      deltaId * MAX_BASIS_POINTS +
      pairInfo.dynamicFeeParameters.volatilityReference

    const maxVolatilityAccumulator =
      pairInfo.staticFeeParameters.maxVolatilityAccumulator

    if (volatilityAccumulator > maxVolatilityAccumulator) {
      return maxVolatilityAccumulator
    } else {
      return volatilityAccumulator
    }
  }

  public getVariableFee(pairInfo: Pair, activeId: number) {
    const variableFeeControl = pairInfo.staticFeeParameters.variableFeeControl

    if (variableFeeControl > 0) {
      const prod =
        this.getVolatilityAccumulator(pairInfo, activeId) * pairInfo.binStep

      const variableFee =
        (prod * prod * variableFeeControl + VARIABLE_FEE_PRECISION - 1) /
        VARIABLE_FEE_PRECISION

      return variableFee
    }

    return variableFeeControl
  }

  public getBaseFee(binStep: number, baseFactor: number) {
    return binStep * baseFactor * 10
  }

  public getFeeForAmount(amount: number, fee: number) {
    const denominator = PRECISION - fee
    const fee_for_amount = (amount * fee + denominator - 1) / denominator

    return fee_for_amount
  }

  public getFeeAmount(amount: number, fee: number) {
    const fee_amount = (amount * fee + PRECISION - 1) / PRECISION

    return fee_amount
  }

  public getProtocolFee(fee: number, protocolShare: number) {
    const protocolFee = (fee * protocolShare) / BASIS_POINT_MAX

    return protocolFee
  }

  public getTotalFee(pairInfo: Pair, activeId: number) {
    return (
      this.getBaseFee(
        pairInfo.binStep,
        pairInfo.staticFeeParameters.baseFactor
      ) + this.getVariableFee(pairInfo, activeId)
    )
  }

  public moveActiveId(pairId: number, swapForY: boolean) {
    if (swapForY) {
      return pairId - 1
    } else {
      return pairId + 1
    }
  }
}
