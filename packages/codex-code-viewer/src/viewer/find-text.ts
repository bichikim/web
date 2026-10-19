export interface TextMatch {
  readonly start: number
  readonly end: number
}

/** Returns non-overlapping, case-insensitive literal matches in UTF-16 source offsets. */
export const findText = (source: string, query: string, limit = Infinity): readonly TextMatch[] => {
  if (query === '' || limit <= 0) {
    return []
  }
  const literal = query.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const matches: TextMatch[] = []
  for (const match of source.matchAll(new RegExp(literal, 'giu'))) {
    matches.push({end: match.index + match[0].length, start: match.index})
    if (matches.length >= limit) {
      break
    }
  }
  return matches
}
