import type {SupertonicSpeechPolicy} from './model'

const PARAGRAPH_SEPARATOR = /(?:\r?\n)[^\S\r\n]*(?:\r?\n)+/u
const LINE_BREAK = /\r?\n/u
const BREAK_CHARACTER = /[\s,;:!?…。！？、，；：]/u

const getCharacters = (text: string) => Array.from(text)

const getCharacterLength = (text: string) => getCharacters(text).length

const findBreakIndex = (
  characters: ReadonlyArray<string>,
  minimumLength: number,
  preferredLength: number,
  maximumLength: number,
) => {
  const preferredEnd = Math.min(preferredLength, characters.length)

  for (let index = preferredEnd; index >= minimumLength; index -= 1) {
    if (BREAK_CHARACTER.test(characters[index - 1]!)) {
      return index
    }
  }

  const maximumEnd = Math.min(maximumLength, characters.length)

  for (let index = preferredEnd + 1; index <= maximumEnd; index += 1) {
    if (BREAK_CHARACTER.test(characters[index - 1]!)) {
      return index
    }
  }

  return preferredEnd
}

const splitOversizedText = (
  text: string,
  policy: SupertonicSpeechPolicy,
): ReadonlyArray<string> => {
  const chunks: Array<string> = []
  let remaining = getCharacters(text.trim())

  while (remaining.length > policy.maximumLength) {
    const breakIndex = findBreakIndex(
      remaining,
      policy.considerSplitLength,
      policy.recommendedLength,
      policy.maximumLength,
    )
    chunks.push(remaining.slice(0, breakIndex).join('').trim())
    remaining = remaining.slice(breakIndex)
  }

  const finalChunk = remaining.join('').trim()
  chunks.push(finalChunk)

  return chunks
}

const getSentences = (paragraph: string, locale: string): ReadonlyArray<string> => {
  const segmenter = new Intl.Segmenter(locale, {granularity: 'sentence'})
  return paragraph
    .split(LINE_BREAK)
    .flatMap((line) => Array.from(segmenter.segment(line), ({segment}) => segment.trim()))
    .filter((sentence) => sentence.length > 0)
}

const packSentences = (
  sentences: ReadonlyArray<string>,
  policy: SupertonicSpeechPolicy,
): ReadonlyArray<string> => {
  const chunks: Array<string> = []
  let currentChunk = ''

  const flushCurrentChunk = () => {
    chunks.push(currentChunk)
    currentChunk = ''
  }

  for (const sentence of sentences.flatMap((item) => splitOversizedText(item, policy))) {
    const candidate = currentChunk.length === 0 ? sentence : `${currentChunk} ${sentence}`
    const candidateLength = getCharacterLength(candidate)
    const shouldSplit = candidateLength > policy.recommendedLength
    const exceedsMaximum = candidateLength > policy.maximumLength

    if (currentChunk.length > 0 && (shouldSplit || exceedsMaximum)) {
      flushCurrentChunk()
      currentChunk = sentence
    } else {
      currentChunk = candidate
    }
  }

  flushCurrentChunk()
  return chunks
}

/** Splits narration at paragraph and sentence boundaries while enforcing the model's hard limit. */
export const splitSpeechText = (
  text: string,
  policy: SupertonicSpeechPolicy,
): ReadonlyArray<string> =>
  text
    .trim()
    .split(PARAGRAPH_SEPARATOR)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .flatMap((paragraph) => packSentences(getSentences(paragraph, policy.locale), policy))
