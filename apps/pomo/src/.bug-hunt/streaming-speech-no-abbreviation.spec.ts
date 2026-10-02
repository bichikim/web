/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../features/chat-voice/streaming-speech-buffer'

it('should not emit No. as its own sentence before a Korean list label', () => {
  const buffer = createStreamingSpeechBuffer({locale: 'ko'})

  expect(buffer.update('No. 5번. 다음 문장.')).toEqual(['No. 5번.', '다음 문장.'])
})
