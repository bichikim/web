/** 존재하는 값 중 순위가 더 높은 값을 선택하고, 순위가 같으면 첫 번째 값을 선택한다. */
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
