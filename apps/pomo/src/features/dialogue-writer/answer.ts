const SPEECH_STYLE_PUNCTUATION_CLASS = '[,.!?，。！？…）);；]'
const SPEECH_STYLE_BOUNDARY_PATTERN = `(?=${SPEECH_STYLE_PUNCTUATION_CLASS}|$)`
const SPEECH_STYLE_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp(`아닙니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '아니에요'],
  [new RegExp(`있습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '있어요'],
  [new RegExp(`없습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '없어요'],
  [new RegExp(`같습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '같아요'],
  [new RegExp(`괜찮습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '괜찮아요'],
  [new RegExp(`주십니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '주세요'],
  [new RegExp(`알겠습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '알겠어요'],
  [new RegExp(`좋습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '좋아요'],
  [new RegExp(`되었습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '되었어요'],
  [new RegExp(`됩니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '돼요'],
  [new RegExp(`했습니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '했어요'],
  [new RegExp(`합니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '해요'],
  [new RegExp(`입니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '이에요'],
  [new RegExp(`겁니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '거예요'],
  [new RegExp(`바랍니다${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '바라요'],
  [new RegExp(`해보라(?=${SPEECH_STYLE_PUNCTUATION_CLASS})`, 'gu'), '해 보세요'],
  [/건가(?<punctuation>[?？])/gu, '건가요$<punctuation>'],
  [/일지(?<punctuation>[?？])/gu, '일까요$<punctuation>'],
  [/일까(?<punctuation>[?？])/gu, '일까요$<punctuation>'],
  [/할까(?<punctuation>[?？])/gu, '할까요$<punctuation>'],
  [new RegExp(`테니까${SPEECH_STYLE_BOUNDARY_PATTERN}`, 'gu'), '테니까요'],
]

/** Converts common formal sentence endings without rewriting the surrounding sentence. */
export const normalizeKoreanSpeechStyle = (answer: string): string =>
  SPEECH_STYLE_REPLACEMENTS.reduce(
    (normalizedAnswer, [pattern, replacement]) => normalizedAnswer.replace(pattern, replacement),
    answer,
  )
