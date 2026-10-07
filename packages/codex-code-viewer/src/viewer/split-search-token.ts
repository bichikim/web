import type {CodeToken} from '../shared/contracts'
import type {TextMatch} from './find-text'

interface SearchFragment {
  readonly text: string
  readonly match: number | null
}

const firstAfter = (
  matches: readonly TextMatch[],
  before: (match: TextMatch) => boolean,
): number => {
  let low = 0
  let high = matches.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (before(matches[middle]!)) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return low
}

/** Splits a token into original text fragments annotated with their search-result index. */
export const splitSearchToken = (
  token: Pick<CodeToken, 'offset' | 'text'>,
  matches: readonly TextMatch[],
): readonly SearchFragment[] => {
  if (token.text === '') {
    return []
  }
  const end = token.offset + token.text.length
  const low = firstAfter(matches, (match) => match.end <= token.offset)
  const high = firstAfter(matches, (match) => match.start < end)
  const relevant = matches.slice(low, high)
  const fragments = relevant.flatMap((match, index): SearchFragment[] => {
    const position = index === 0 ? token.offset : Math.min(end, relevant[index - 1]!.end)
    const start = Math.max(token.offset, match.start)
    const stop = Math.min(end, match.end)
    const prefix = token.text.slice(position - token.offset, start - token.offset)
    const highlight = {
      match: low + index,
      text: token.text.slice(start - token.offset, stop - token.offset),
    }
    return prefix === '' ? [highlight] : [{match: null, text: prefix}, highlight]
  })
  const position = relevant.length === 0 ? token.offset : Math.min(end, relevant.at(-1)!.end)
  const suffix = token.text.slice(position - token.offset)
  return suffix === '' ? fragments : [...fragments, {match: null, text: suffix}]
}
