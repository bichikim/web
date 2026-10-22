/** Two keyform indices of a 1D binding and the progress from the first to the second. */
export interface KeyformSegment {
  readonly from: number
  readonly progress: number
  readonly to: number
}

const getProgress = (minimum: number, maximum: number, value: number) =>
  maximum === minimum ? 0 : (value - minimum) / (maximum - minimum)

/**
 * Where `value` falls among a 1D binding's increasing keyform values. With a repeat range, the
 * keyform at the maximum is ignored and values past the last keyform, or before the first,
 * blend from the last keyform into the first one placed one range later.
 */
export const locateOneDimensionalKeyform = (
  keys: ReadonlyArray<number>,
  value: number,
  repeatRange?: readonly [number, number],
): KeyformSegment | undefined => {
  const indices = keys.flatMap((key, index) =>
    repeatRange === undefined || key < repeatRange[1] ? [index] : [],
  )
  const [first] = indices
  const last = indices.at(-1)
  if (first === undefined || last === undefined) {
    return undefined
  }
  if (repeatRange !== undefined && (value >= keys[last]! || value < keys[first]!)) {
    const span = repeatRange[1] - repeatRange[0]
    const unwrapped = value < keys[first]! ? value + span : value
    return {
      from: last,
      progress: getProgress(keys[last]!, keys[first]! + span, unwrapped),
      to: first,
    }
  }
  const next = indices.find((index) => keys[index]! >= value)
  if (next === undefined) {
    return {from: last, progress: 0, to: last}
  }
  const previous = indices[indices.indexOf(next) - 1]
  return previous === undefined
    ? {from: next, progress: 0, to: next}
    : {from: previous, progress: getProgress(keys[previous]!, keys[next]!, value), to: next}
}
