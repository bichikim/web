/** Accumulates indexed products into the bias in input order, using the selected weight offset. */
export const affineDotProduct = (
  values: ReadonlyArray<number>,
  weights: ReadonlyArray<number>,
  bias: number,
  weightOffset = 0,
): number => {
  let score = bias

  for (let index = 0; index < values.length; index += 1) {
    score += weights[weightOffset + index] * values[index]
  }

  return score
}
