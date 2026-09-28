/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../features/chat-voice/streaming-speech-buffer'

it('should flush the full replacement text when the final answer replaces streamed content', () => {
  const buffer = createStreamingSpeechBuffer({locale: 'ko'})

  expect(buffer.update('Earlier sentence.')).toEqual(['Earlier sentence.'])

  expect(buffer.flush('Replacement sentence is much longer.')).toBe(
    'Replacement sentence is much longer.',
  )
})
