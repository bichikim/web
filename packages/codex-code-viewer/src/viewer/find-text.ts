export interface TextMatch {
  readonly start: number
  readonly end: number
}

/** Returns non-overlapping, case-insensitive literal matches in UTF-16 source offsets. */
export const findText = (source: string, query: string): readonly TextMatch[] => {
  if (query === '') {
    return []
  }
  const literal = query.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return Array.from(source.matchAll(new RegExp(literal, 'giu')), (match) => ({
    end: match.index + match[0].length,
    start: match.index,
  }))
}
