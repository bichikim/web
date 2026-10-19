import type {SupertonicSpeechPolicy} from './model'

const PARAGRAPH_SEPARATOR = /(?:\r?\n)[^\S\r\n]*(?:\r?\n)+/u
const LINE_BREAK = /\r?\n/u
const BREAK_CHARACTER = /[\s,;:!?…。！？、，；：]/u

const getCharacters = (text: string) => Array.from(text)

const getCharacterLength = (text: string) => getCharacters(text).length

const findBreakIndex = (
  characters: ReadonlyArray<string>,
  offset: number,
  policy: SupertonicSpeechPolicy,
) => {
  const {considerSplitLength, maximumLength, recommendedLength} = policy
  const remainingLength = characters.length - offset
  const preferredEnd = Math.min(recommendedLength, maximumLength, remainingLength)

  for (let index = preferredEnd; index >= considerSplitLength; index -= 1) {
    if (index > 0 && BREAK_CHARACTER.test(characters[offset + index - 1]!)) {
      return index
    }
  }

  const maximumEnd = Math.min(maximumLength, remainingLength)

  for (let index = preferredEnd + 1; index <= maximumEnd; index += 1) {
    if (index > 0 && BREAK_CHARACTER.test(characters[offset + index - 1]!)) {
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
  const characters = getCharacters(text.trim())
  let offset = 0

  while (characters.length - offset > policy.maximumLength) {
    const breakIndex = Math.trunc(findBreakIndex(characters, offset, policy)) || 0
    // Preserve slice's integer coercion and negative indexes for runtime policies.
    const length =
      breakIndex < 0 ? Math.max(0, characters.length - offset + breakIndex) : breakIndex
    const end = offset + length
    chunks.push(characters.slice(offset, end).join('').trim())
    offset = end
  }

  const finalChunk = characters.slice(offset).join('').trim()
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
