import {expect, test} from 'vitest'
import {measureSoundRms} from '../measure-sound-rms'

test('should average channel powers instead of cancelling opposite stereo channels', () => {
  const samples = Float32Array.of(0.25, 0.75, -0.75, -0.25)
  const sound = {
    channels: [samples, samples.map((value) => -value)],
    mono: new Float32Array(4),
    sampleRate: 4,
  }
  expect(measureSoundRms(sound, 0.5, 0.5)).toBeCloseTo(Math.sqrt(0.3125))
  expect(measureSoundRms(sound, 0, 0.5)).toBe(0)
  expect(measureSoundRms(sound, 1.25, 0.5)).toBe(0.25)
  expect(measureSoundRms(sound, 1.5, 0.5)).toBeUndefined()
})
