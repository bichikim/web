const URL_PATTERN = /\bhttps?:\/\/\S+/giu
const URL_SEMICOLON_PATTERN = /;(?=\S)/gu
const SEGMENT_PATTERN =
  /(?:[^,;；.!?。！？，\n\t]|(?<=[\p{Script=Latin}\p{N}])\.(?=[\p{Script=Latin}\p{N}]))+(?:[,;；.!?。！？，]|[\n\t]|$)\s*/gu
const TRAILING_SEPARATOR_PATTERN = /[,，;；]$/u
const NORMALIZATION_PATTERN = /[,;；.!?。！？，\s]+$/gu
const WHITESPACE_PATTERN = /\s+/gu
const MINIMUM_REPEATED_LENGTH = 4
const MAXIMUM_CONSECUTIVE_REPETITIONS = 3
const URL_SEMICOLON_PLACEHOLDER = '\u0000'

const protectUrlSemicolons = (answer: string) =>
  answer.replace(URL_PATTERN, (url) =>
    url.replace(URL_SEMICOLON_PATTERN, URL_SEMICOLON_PLACEHOLDER),
  )

const normalizeSegment = (segment: string) =>
  segment.replace(NORMALIZATION_PATTERN, '').trim().replace(WHITESPACE_PATTERN, ' ')

/** Removes a runaway sequence while preserving ordinary emphasis up to three times. */
export const trimRepetitiveTail = (answer: string): string => {
  const segmentedAnswer = protectUrlSemicolons(answer)
  let previousSegment = ''
  let repetitionCount = 0

  for (const match of segmentedAnswer.matchAll(SEGMENT_PATTERN)) {
    const segment = normalizeSegment(match[0])
    const isRepeated = segment.length >= MINIMUM_REPEATED_LENGTH && segment === previousSegment

    repetitionCount = isRepeated ? repetitionCount + 1 : 1
    previousSegment = segment

    if (repetitionCount > MAXIMUM_CONSECUTIVE_REPETITIONS) {
      return answer.slice(0, match.index).trimEnd().replace(TRAILING_SEPARATOR_PATTERN, '.')
    }
  }

  return answer.trim()
}
