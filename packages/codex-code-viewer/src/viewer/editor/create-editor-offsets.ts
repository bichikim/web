const upperBound = (positions: readonly number[], offset: number): number => {
  let from = 0
  let to = positions.length
  while (from < to) {
    const middle = Math.floor((from + to) / 2)
    if (positions[middle] <= offset) {
      from = middle + 1
    } else {
      to = middle
    }
  }
  return from
}

/** Maps UTF-16 source positions to LF-normalized editor positions and back. */
export const createEditorOffsets = (source: string) => {
  const original = Array.from(source.matchAll(/\r\n/gu), (match) => match.index + 2)
  const normalized = original.map((position, index) => position - index - 1)
  return {
    toEditor: (offset: number): number => offset - upperBound(original, offset),
    toSource: (offset: number): number => offset + upperBound(normalized, offset),
  }
}
