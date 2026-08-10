const SEGMENT_PATTERN = /[^,.!?。！？，\n]+(?:[,.!?。！？，]|\n|$)\s*/gu
const TRAILING_SEPARATOR_PATTERN = /[,，]$/u
const NORMALIZATION_PATTERN = /[,.!?。！？，\s]+$/gu
const WHITESPACE_PATTERN = /\s+/gu
const MINIMUM_REPEATED_LENGTH = 4
const MAXIMUM_CONSECUTIVE_REPETITIONS = 3
const SENTENCE_END_PATTERN = '(?=[.!?。！？]|$)'
const SPEECH_STYLE_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp(`아닙니다${SENTENCE_END_PATTERN}`, 'gu'), '아니에요'],
  [new RegExp(`있습니다${SENTENCE_END_PATTERN}`, 'gu'), '있어요'],
  [new RegExp(`없습니다${SENTENCE_END_PATTERN}`, 'gu'), '없어요'],
  [new RegExp(`같습니다${SENTENCE_END_PATTERN}`, 'gu'), '같아요'],
  [new RegExp(`괜찮습니다${SENTENCE_END_PATTERN}`, 'gu'), '괜찮아요'],
  [new RegExp(`좋습니다${SENTENCE_END_PATTERN}`, 'gu'), '좋아요'],
  [new RegExp(`되었습니다${SENTENCE_END_PATTERN}`, 'gu'), '되었어요'],
  [new RegExp(`됩니다${SENTENCE_END_PATTERN}`, 'gu'), '돼요'],
  [new RegExp(`했습니다${SENTENCE_END_PATTERN}`, 'gu'), '했어요'],
  [new RegExp(`합니다${SENTENCE_END_PATTERN}`, 'gu'), '해요'],
  [new RegExp(`입니다${SENTENCE_END_PATTERN}`, 'gu'), '이에요'],
  [new RegExp(`겁니다${SENTENCE_END_PATTERN}`, 'gu'), '거예요'],
  [new RegExp(`바랍니다${SENTENCE_END_PATTERN}`, 'gu'), '바라요'],
  [/해보라(?=[,.!?。！？，])/gu, '해 보세요'],
  [/건가\?/gu, '건가요?'],
  [/일지\?/gu, '일까요?'],
  [/일까\?/gu, '일까요?'],
  [/할까\?/gu, '할까요?'],
  [/테니까(?=[.!?。！？])/gu, '테니까요'],
]

const normalizeSegment = (segment: string) =>
  segment.replace(NORMALIZATION_PATTERN, '').trim().replace(WHITESPACE_PATTERN, ' ')

/** Converts common formal sentence endings without rewriting the surrounding sentence. */
export const normalizeKoreanSpeechStyle = (answer: string): string =>
  SPEECH_STYLE_REPLACEMENTS.reduce(
    (normalizedAnswer, [pattern, replacement]) => normalizedAnswer.replace(pattern, replacement),
    answer,
  )

/** Removes a runaway sequence while preserving ordinary emphasis up to three times. */
export const trimRepetitiveTail = (answer: string): string => {
  let previousSegment = ''
  let repetitionCount = 0

  for (const match of answer.matchAll(SEGMENT_PATTERN)) {
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
