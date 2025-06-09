export const divRem = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    throw new Error('Division by zero') // Xử lý lỗi chia cho 0
  }

  // Tính thương và phần dư
  const quotient = numerator / denominator // Thương
  const remainder = numerator % denominator // Phần dư

  return [quotient, remainder] // Trả về mảng chứa thương và phần dư
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
