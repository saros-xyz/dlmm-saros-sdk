export const divRem = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    throw new Error("Division by zero");
  }

  // Calculate quotient and remainder
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  return [quotient, remainder];
};
