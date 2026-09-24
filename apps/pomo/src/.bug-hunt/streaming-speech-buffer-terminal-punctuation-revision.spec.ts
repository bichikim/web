/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createStreamingSpeechBuffer} from '../features/chat-voice/streaming-speech-buffer'

it('should not re-emit a sentence when only terminal punctuation changes without a shared prefix', () => {
  const buffer = createStreamingSpeechBuffer({locale: 'en'})

  expect(buffer.update('Hello world.')).toEqual(['Hello world.'])
  expect(buffer.update('Hello world!')).toEqual([])
})
