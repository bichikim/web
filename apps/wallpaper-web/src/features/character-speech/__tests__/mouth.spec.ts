import {expect, test} from 'vitest'
import {createSpeechMouth} from '../mouth'

test('should close the mouth for silent audio and release after the clip', () => {
  const mouth = createSpeechMouth({sampleRate: 1000, samples: new Float32Array(1000)}, '아')
  expect(mouth(0.1).open).toBe(0)
  expect(mouth(1).open).toBe(0)
})

test('should distinguish wide and round vowels while following the PCM volume', () => {
  const audio = {sampleRate: 1000, samples: new Float32Array(1000).fill(0.1)}
  const wide = createSpeechMouth(audio, '이')
  const round = createSpeechMouth(audio, '오')
  expect(wide(0.2).form).toBeGreaterThan(0.9)
  expect(round(0.2).form).toBeLessThan(-0.9)
  expect(wide(0.3).open).toBeGreaterThan(0.5)
  expect(round(0.3).open).toBeGreaterThan(0.6)
  expect(round(2).open).toBeLessThan(0.01)
})
