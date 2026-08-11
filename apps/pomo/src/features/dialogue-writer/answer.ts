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

/** Converts common formal sentence endings without rewriting the surrounding sentence. */
export const normalizeKoreanSpeechStyle = (answer: string): string =>
  SPEECH_STYLE_REPLACEMENTS.reduce(
    (normalizedAnswer, [pattern, replacement]) => normalizedAnswer.replace(pattern, replacement),
    answer,
  )
