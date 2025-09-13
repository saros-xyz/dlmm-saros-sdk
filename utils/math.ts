export const divRem = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    throw new Error('Division by zero')
  }

  const quotient = numerator / denominator
  const remainder = numerator % denominator

  return [quotient, remainder]
}

/// (x * y) / denominator
export const mulDiv = (
  x: number,
  y: number,
  denominator: number,
  rounding: 'up' | 'down'
) => {
  const prod = x * y

  if (rounding === 'up') {
    return Math.floor((prod + denominator - 1) / denominator)
  }

  if (rounding === 'down') {
    const [quotient] = divRem(prod, denominator)
    return quotient
  }
}

export const mulShr = (
  x: number,
  y: number,
  offset: number,
  rounding: 'up' | 'down'
) => {
  const denominator = 1 << offset
  return mulDiv(x, y, denominator, rounding)
}

// (x << offset) / y
export const shlDiv = (
  x: number,
  y: number,
  offset: number,
  rounding: 'up' | 'down'
) => {
  const scale = 1 << offset
  return mulDiv(x, scale, y, rounding)
}
