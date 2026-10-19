import {findText, type TextMatch} from '../find-text'

interface WhitespaceRun {
  readonly start: number
  readonly removed: number
}

/** Prepares repeated literal searches across PDF whitespace with original UTF-16 offsets. */
export const createTextSearch = (
  source: string,
): ((query: string, limit?: number) => readonly TextMatch[]) => {
  const runs: WhitespaceRun[] = []
  let removed = 0
  const normalized = source.replace(/\s+/gu, (value: string, index: number) => {
    const start = index - removed
    removed += value.length - 1
    runs.push({removed, start})
    return ' '
  })
  const original = (index: number): number => {
    let lower = 0
    let upper = runs.length
    while (lower < upper) {
      const middle = Math.floor((lower + upper) / 2)
      if (runs[middle].start < index) {
        lower = middle + 1
      } else {
        upper = middle
      }
    }
    return index + (runs[lower - 1]?.removed ?? 0)
  }
  return (query, limit) =>
    findText(normalized, query.trim().replace(/\s+/gu, ' '), limit).map((match) => ({
      end: original(match.end),
      start: original(match.start),
    }))
}
