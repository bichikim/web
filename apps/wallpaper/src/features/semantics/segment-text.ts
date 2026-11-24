import type {SemanticSegment} from './types'
interface SegmentTextOptions {
  /** Speakable prose; offsets refer to this unchanged string. */
  readonly text: string
  /** False leaves the unfinished streaming tail open; omission treats the response as complete. */
  readonly complete?: boolean
}
const MAXIMUM_LENGTH = 320
const SENTENCE_COUNT = 2
const HIGH_SURROGATE_START = 0xd800
const HIGH_SURROGATE_END = 0xdbff
const SENTENCE_END = /[.!?。！？…][”’"')\]]*\s*$/u
const sentences = new Intl.Segmenter(undefined, {granularity: 'sentence'})

const boundedParts = (text: string): readonly string[] => {
  const parts: string[] = []
  let offset = 0
  while (offset < text.length) {
    const limit = Math.min(text.length, offset + MAXIMUM_LENGTH)
    const boundary = limit < text.length ? text.lastIndexOf(' ', limit - 1) : -1
    let end = boundary > offset ? boundary + 1 : limit
    const previous = text.charCodeAt(end - 1)
    if (end < text.length && previous >= HIGH_SURROGATE_START && previous <= HIGH_SURROGATE_END) {
      end -= 1
    }
    parts.push(text.slice(offset, end))
    offset = end
  }
  return parts
}

/** Groups prose by paragraphs and pairs of sentences, independently of speech model chunk sizes. */
export const segmentText = (options: SegmentTextOptions): readonly SemanticSegment[] =>
  Array.from(options.text.matchAll(/[^\n]+/gu)).flatMap((paragraph) => {
    const base = paragraph.index
    const parts = Array.from(sentences.segment(paragraph[0])).flatMap((sentence) =>
      boundedParts(sentence.segment),
    )
    const result: SemanticSegment[] = []
    let start = base
    let end = base
    let count = 0
    const flush = (complete: boolean) => {
      const source = options.text.slice(start, end)
      const text = source.trim()
      if (text !== '') {
        const leading = source.length - source.trimStart().length
        result.push({complete, end: start + leading + text.length, start: start + leading, text})
      }
      start = end
      count = 0
    }
    for (const [index, part] of parts.entries()) {
      if (count > 0 && end - start + part.length > MAXIMUM_LENGTH) {
        flush(true)
      }
      end += part.length
      count += 1
      const following = index < parts.length - 1
      if (count >= SENTENCE_COUNT || part.length >= MAXIMUM_LENGTH) {
        flush(following || options.complete !== false || SENTENCE_END.test(part))
      }
    }
    if (end > start) {
      flush(options.complete !== false || end < options.text.length)
    }
    return result
  })
