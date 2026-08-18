/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const SENTENCE_END = /(?:[.!?…。！？]["'”’)}\]]*|\n)\s*$/u

export interface CreateStreamingSpeechBufferOptions {
  readonly locale: string
}

export interface StreamingSpeechBuffer {
  readonly flush: (text: string) => string | null
  readonly reset: () => void
  readonly update: (text: string) => ReadonlyArray<string>
}

const isCompletedSentence = (segment: string) => SENTENCE_END.test(segment)

/** Holds the unstable streaming tail and emits only completed sentences once. */
export const createStreamingSpeechBuffer = (
  options: CreateStreamingSpeechBufferOptions,
): StreamingSpeechBuffer => {
  const segmenter = new Intl.Segmenter(options.locale, {granularity: 'sentence'})
  let consumedLength = 0

  const reset = () => {
    consumedLength = 0
  }

  const update = (text: string) => {
    if (text.length < consumedLength) {
      reset()
    }

    const remainingText = text.slice(consumedLength)
    const completedSegments = Array.from(segmenter.segment(remainingText)).filter(({segment}) =>
      isCompletedSentence(segment),
    )
    const lastSegment = completedSegments.at(-1)

    if (lastSegment !== undefined) {
      consumedLength += lastSegment.index + lastSegment.segment.length
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
    return remainingText.length > 0 ? remainingText : null
  }

  return {flush, reset, update}
}
