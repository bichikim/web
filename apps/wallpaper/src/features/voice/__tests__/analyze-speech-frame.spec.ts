import {expect, it} from 'vitest'
import {analyzeSpeechFrame} from '../analyze-speech-frame'
import {synthesizeVowel} from '../../../../../../packages/puppet/src/player/voice/__tests__/support/synthesize-vowel'

it.each([
  ['a', [780, 1220]],
  ['i', [290, 2350]],
  ['u', [340, 1380]],
  ['e', [490, 1880]],
  ['o', [480, 820]],
] as const)(
  'should extract %s from PCM even when the transcript says a different vowel',
  (vowel, formants) => {
    const samples = Float32Array.from(
      synthesizeVowel(formants, {length: 640, pitch: 120, rate: 16000, rms: 0.1}),
    )
    const weights = analyzeSpeechFrame(
      {sampleRate: 16000, samples, text: '입모양과 무관한 글'},
      0.02,
    )
    const strongest = Object.entries(weights).toSorted((a, b) => b[1] - a[1])[0]![0]
    expect(strongest).toBe(vowel)
    expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
  },
)
it('should leave silence, exhausted clips and unsupported sample rates without a forced text pose', () => {
  const audio = {sampleRate: 16000, samples: new Float32Array(640), text: '아'}
  expect(analyzeSpeechFrame(audio, 0.01)).toEqual({})
  expect(analyzeSpeechFrame(audio, 1)).toEqual({})
  expect(analyzeSpeechFrame(audio, -1)).toEqual({})
  expect(analyzeSpeechFrame({...audio, sampleRate: 100}, 0)).toEqual({})
})
