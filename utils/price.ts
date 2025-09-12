import { ACTIVE_ID, MAX_BASIS_POINTS, ONE, SCALE_OFFSET } from '../constants/config'

const getBase = (binStep: number) => {
  const quotient = binStep << SCALE_OFFSET
  if (quotient < 0) return null

  const basisPointMaxBigInt = MAX_BASIS_POINTS

  //@ts-ignore
  if (basisPointMaxBigInt === 0) return null
  const fraction = quotient / basisPointMaxBigInt

  const oneBigInt = ONE
  const result = oneBigInt + fraction

  return result
}

export const getPriceFromId = (
  bin_step: number,
  bin_id: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
) => {
  const base = getBase(bin_step) as number
  const exponent = bin_id - ACTIVE_ID;
  const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal)

  return Math.pow(base, exponent) * decimalPow
}

export const getIdFromPrice = (
  price: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (price <= 0) throw new Error('Price must be greater than 0')
  if (binStep <= 0 || binStep > MAX_BASIS_POINTS)
    throw new Error('Bin step invalid. (0 < binStep <= 10000)')

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal)

  const base = 1 + binStep / MAX_BASIS_POINTS
  const exponent = Math.log(price * decimalPow) / Math.log(base)
  const binId = Math.round(exponent + ACTIVE_ID)

  return binId
}
