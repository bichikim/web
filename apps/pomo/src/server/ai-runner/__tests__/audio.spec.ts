/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createWaveBuffer, decodePcmWav, resampleAudio} from '../audio'

describe('runner PCM audio', () => {
  it.each([0, 1, 7999])(
    'should reject a %i Hz WAV before resampling can amplify its allocation',
    (sampleRate) => {
      const input = createWaveBuffer(new Float32Array(100), sampleRate)
      expect(() => decodePcmWav(input)).toThrow()
    },
  )

  it.each([8000, 16000, 44100, 48000])(
    'should preserve supported %i Hz speech input',
    (sampleRate) => {
      const input = createWaveBuffer(new Float32Array(sampleRate), sampleRate)
      const decoded = decodePcmWav(input)
      expect(decoded.sampleRate).toBe(sampleRate)
      expect(resampleAudio(decoded, 16000)).toHaveLength(16000)
    },
  )
})

it('should reject an oversized resampling request before allocating its output', () => {
  expect(() =>
    resampleAudio({sampleRate: 8000, samples: new Float32Array(1)}, Number.MAX_SAFE_INTEGER),
  ).toThrow('resampling limit')
})
