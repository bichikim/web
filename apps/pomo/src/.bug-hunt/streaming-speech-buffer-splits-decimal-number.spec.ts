/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../features/chat-voice/streaming-speech-buffer'

const speakStreamedByPrefixes = (text: string, prefixLengths: ReadonlyArray<number>) => {
  const buffer = createStreamingSpeechBuffer({locale: 'ko'})
  const spoken = prefixLengths.flatMap((length) => buffer.update(text.slice(0, length)))
  const remainder = buffer.flush(text)

  return remainder === null ? spoken : [...spoken, remainder]
}

it.each([
  '원주율은 3.14입니다. 다음 문장이에요.',
  'Python 3.12 버전을 설치하세요. 다음 문장이에요.',
])(
  'should not speak a decimal number in two pieces when "." arrives before the digits: %s',
  (text) => {
    const wholeText = speakStreamedByPrefixes(text, [text.length])
    const dotIndex = text.indexOf('.')
    const streamedAtDecimalPoint = speakStreamedByPrefixes(text, [dotIndex + 1, text.length])

    expect(streamedAtDecimalPoint).toEqual(wholeText)
  },
)
