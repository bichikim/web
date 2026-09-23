/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const SENTENCE_END = /(?:[.!?…。！？]["'”’)}\]]*|\n)\s*$/u
const KNOWN_ABBREVIATION =
  /^(?:Dr|Mr|Mrs|Ms|Prof|Rev|Hon|Gov|Pres|Sen|Rep|Gen|Lt|Col|Capt|Sgt|St|Mt|Jr|Sr|vs)\.$/iu
const DOTTED_ABBREVIATION = /^(?:[A-Z]\.){2,}$/iu
const SINGLE_INITIAL = /^[A-Z]\.$/u
const SINGLE_LETTER_LABEL_END =
  /(?:^|\s)(?:category|option|answer|choice|part|section|step|level|plan)\s+[A-Z]\.\s*$/iu
const LAST_TOKEN = /(?:^|\s)[["'“‘({]*(?<token>\S+?)["'”’)}\]]*\s*$/u

export interface CreateStreamingSpeechBufferOptions {
  readonly locale: string
}

export interface StreamingSpeechBuffer {
  readonly flush: (text: string) => string | null
  readonly reset: () => void
  readonly update: (text: string) => ReadonlyArray<string>
}

const endsWithAbbreviation = (segment: string) => {
  if (SINGLE_LETTER_LABEL_END.test(segment)) {
    return false
  }

  const lastToken = LAST_TOKEN.exec(segment)?.groups?.token

  return (
    lastToken !== undefined &&
    (KNOWN_ABBREVIATION.test(lastToken) ||
      DOTTED_ABBREVIATION.test(lastToken) ||
      SINGLE_INITIAL.test(lastToken))
  )
}

const isCompletedSentence = (segment: string) =>
  SENTENCE_END.test(segment) && !endsWithAbbreviation(segment)

/** Holds the unstable streaming tail and emits only completed sentences once. */
export const createStreamingSpeechBuffer = (
  options: CreateStreamingSpeechBufferOptions,
): StreamingSpeechBuffer => {
  const segmenter = new Intl.Segmenter(options.locale, {granularity: 'sentence'})
  let consumedLength = 0
  let consumedText = ''

  const reset = () => {
    consumedLength = 0
    consumedText = ''
  }

  const update = (text: string) => {
    if (!text.startsWith(consumedText)) {
      reset()
    }

    const remainingText = text.slice(consumedLength)
    const segments = Array.from(segmenter.segment(remainingText))
    const combinedSegments = segments.reduce(
      (mergedSegments, segment) => {
        const previousSegment = mergedSegments.at(-1)

        if (previousSegment !== undefined && endsWithAbbreviation(previousSegment.segment)) {
          mergedSegments[mergedSegments.length - 1] = {
            ...previousSegment,
            segment: `${previousSegment.segment}${segment.segment}`,
          }
          return mergedSegments
        }

        mergedSegments.push(segment)
        return mergedSegments
      },
      [] as typeof segments,
    )
    const completedSegments = combinedSegments.filter(({segment}) => isCompletedSentence(segment))
    const lastSegment = completedSegments.at(-1)

    if (lastSegment !== undefined) {
      consumedLength += lastSegment.index + lastSegment.segment.trimEnd().length
      consumedText = text.slice(0, consumedLength)
    }

    return completedSegments
      .map(({segment}) => segment.trim())
      .filter((segment) => segment.length > 0)
  }

  const flush = (text: string) => {
    if (text.length < consumedLength) {
      return null
    }

    const remainingText = text.slice(consumedLength).trim()
    consumedLength = text.length
    consumedText = text
    return remainingText.length > 0 ? remainingText : null
  }

  return {flush, reset, update}
}
