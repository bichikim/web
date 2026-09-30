/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../features/chat-voice/streaming-speech-buffer'

const speakStreamed = (text: string, chunkSize: number) => {
  const buffer = createStreamingSpeechBuffer({locale: 'ko'})
  const spoken: string[] = []

  for (let end = chunkSize; end < text.length + chunkSize; end += chunkSize) {
    spoken.push(...buffer.update(text.slice(0, Math.min(end, text.length))))
  }

  const remainder = buffer.flush(text)
  return remainder === null ? spoken : [...spoken, remainder]
}

const withoutWhitespace = (value: string) => value.replace(/\s+/gu, '')

describe('createStreamingSpeechBuffer never drops streamed text', () => {
  it.each([
    ['좋아요‼ 그렇죠.', 1],
    ['좋아요⁉ 그렇죠.', 1],
    ['그는 「안녕.」이라고 했다.', 64],
    ['결과입니다.） 다음 문장이에요.', 64],
    ['결과입니다.» 다음 문장이에요.', 64],
  ] as const)('should speak every character of %s', (text, chunkSize) => {
    const spoken = speakStreamed(text, chunkSize)

    expect(withoutWhitespace(spoken.join(''))).toBe(withoutWhitespace(text))
  })
})
