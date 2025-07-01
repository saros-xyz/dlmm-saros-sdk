import { BASIS_POINT_MAX, ONE, SCALE_OFFSET } from '../constants/config'

const getBase = (binStep: number) => {
  const quotient = binStep << SCALE_OFFSET
  if (quotient < 0) return null

  const basisPointMaxBigInt = BASIS_POINT_MAX

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
  const exponent = bin_id - 8_388_608
  const decimalPow = Math.pow(10, baseTokenDecimal - quoteTokenDecimal)

  return Math.pow(base, exponent) * decimalPow
}

export const getIdFromPrice = (
  price: number,
  binStep: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number
): number => {
  if (price <= 0) throw new Error('Giá phải lớn hơn 0')
  if (binStep <= 0 || binStep > BASIS_POINT_MAX)
    throw new Error('Bin step invalid')

  const decimalPow = Math.pow(10, quoteTokenDecimal - baseTokenDecimal)

  const base = 1 + binStep / BASIS_POINT_MAX
  const exponent = Math.log(price * decimalPow) / Math.log(base)
  const binId = Math.round(exponent + 8_388_608)

  return binId
}
