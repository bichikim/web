/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createWaveBuffer, decodePcmWav, resampleAudio} from '../audio'

describe('runner PCM audio', () => {
  it('should average stereo frames into mono samples', () => {
    const input = createWaveBuffer(Float32Array.of(-1, 1, 0.5, 0.5), 16000)
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
    view.setUint16(22, 2, true)
    view.setUint32(28, 64000, true)
    view.setUint16(32, 4, true)

    const decoded = decodePcmWav(input)
    expect(decoded.sampleRate).toBe(16000)
    expect(decoded.samples).toEqual(Float32Array.of(-1 / 65536, 16383 / 32768))
  })

  it('should retain the available samples when the final data chunk is truncated', () => {
    const input = createWaveBuffer(Float32Array.of(-1, 1), 16000).slice(0, -2)
    expect(decodePcmWav(input).samples).toEqual(Float32Array.of(-1))
  })

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
