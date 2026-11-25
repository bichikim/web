import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
import {PUPPET_VOWELS, type PuppetVowelWeights} from '../../document'
import {analyzeVowels, estimateFormants, measureVoiceLevel} from '../analyze-vowels'
import speech from './fixtures/vowels.json'
import {synthesizeVowel} from './support/synthesize-vowel'

const strongest = (weights: PuppetVowelWeights) =>
  PUPPET_VOWELS.reduce((best, vowel) => (weights[vowel] > weights[best] ? vowel : best))

const decode = (samples: string) => {
  const bytes = Buffer.from(samples, 'base64')
  return Float64Array.from(
    {length: bytes.length / 2},
    (_, index) => bytes.readInt16LE(index * 2) / 32767,
  )
}

describe('analyzeVowels', () => {
  it.each(speech.clips)('should distinguish $vowel in $speaker speech', (clip) => {
    const samples = decode(clip.samples)
    const length = Math.floor((2048 / 48000) * speech.sampleRate)
    const frames = Array.from({length: Math.floor(samples.length / length)}, (_, index) =>
      samples.subarray(index * length, (index + 1) * length),
    ).filter((frame) => measureVoiceLevel(frame) > 0.1)
    const voiced = frames
      .map((frame) => analyzeVowels(frame, speech.sampleRate))
      .filter((frame) => frame.level > 0)
    expect(voiced.length / frames.length).toBeGreaterThan(0.8)
    const weights = Object.fromEntries(
      PUPPET_VOWELS.map((vowel) => [
        vowel,
        voiced.reduce((sum, frame) => sum + frame.weights[vowel] / frame.level, 0),
      ]),
    ) as PuppetVowelWeights
    expect(strongest(weights)).toBe(clip.vowel)
    expect(
      voiced.filter((frame) => strongest(frame.weights) === clip.vowel).length / voiced.length,
    ).toBeGreaterThanOrEqual(0.7)
  })

  it.each([16000, 44100, 48000])(
    'should resolve adjacent rounded-vowel resonances at %i Hz',
    (rate) => {
      const samples = synthesizeVowel([440, 900], {
        length: Math.round(rate * 0.043),
        rate,
        rms: 0.02,
      })
      const [first = 0, second = 0] = estimateFormants(samples, rate) ?? []
      expect(Math.abs(first - 440)).toBeLessThan(80)
      expect(Math.abs(second - 900)).toBeLessThan(100)
      expect(strongest(analyzeVowels(samples, rate).weights)).toBe('o')
    },
  )

  it.each([
    [300, 2800],
    [430, 2600],
    [420, 1100],
    [450, 850],
  ])('should keep loudness independent of the vowel at %i and %i Hz', (first, second) => {
    const samples = synthesizeVowel([first, second], {length: 2048, rate: 48000, rms: 0.02})
    const analysis = analyzeVowels(samples, 48000)
    expect(analysis.level).toBeCloseTo(measureVoiceLevel(samples))
    expect(Object.values(analysis.weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      analysis.level,
    )
  })
})
