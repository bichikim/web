/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getOpusEncodingInput} from '../features/supertonic/opus-sampling'

it('should not drop non-empty legacy PCM when resampling rounds to zero output frames', () => {
  const samples = new Float32Array([0.25, -0.5, 0.75])
  const sampleRate = 384_000

  const result = getOpusEncodingInput(samples, sampleRate)

  expect(result.sampleRate).toBe(48_000)
  expect(result.samples.length).toBeGreaterThan(0)
})
