/** Selects the present value with the greater rank, preferring the first on ties. */
export const selectMaximumBy = <Value>(
  first: Value | null,
  second: Value | null,
  rank: (value: Value) => number,
): Value | null => {
  if (first === null) {
    return second
  }
  if (second === null) {
    return first
  }
  return rank(first) >= rank(second) ? first : second
}
