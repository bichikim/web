import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  PUPPET_VOWELS,
  type PuppetDocument,
  type PuppetVowel,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {analyzeVowels, estimateFormants, toVowelWeights} from '../analyze-vowels'
import {advanceMouthShapes, applyMouthShapes, normalizeVowelWeights} from '../mouth-shapes'
import {synthesizeVowel} from './support/synthesize-vowel'

const RATE = 16000
const FRAME = 640
/** A 40 ms frame of a synthesized vowel. */
const synthesize = (formants: readonly number[], rms = 0.1, pitch = 120) =>
  synthesizeVowel(formants, {length: FRAME, pitch, rate: RATE, rms})

const strongest = (weights: Readonly<Record<PuppetVowel, number>>) =>
  PUPPET_VOWELS.reduce((best, vowel) => (weights[vowel] > weights[best] ? vowel : best))

const FORMANTS: ReadonlyArray<readonly [PuppetVowel, readonly number[]]> = [
  ['a', [780, 1220]],
  ['i', [290, 2350]],
  ['u', [340, 1380]],
  ['e', [490, 1880]],
  ['o', [480, 820]],
]

describe('voice', () => {
  test('should find the formants and the vowel of synthesized vowels', () => {
    for (const [vowel, formants] of FORMANTS) {
      const samples = synthesize(formants)
      const [first = 0, second = 0] = estimateFormants(samples, RATE) ?? []
      // Within half a 120 Hz harmonic plus the 10 Hz search step.
      expect(Math.abs(first - formants[0]!)).toBeLessThanOrEqual(70)
      expect(Math.abs(second - formants[1]!)).toBeLessThan(100)
      const {level, weights} = analyzeVowels(samples, RATE)
      expect(level).toBe(1)
      expect(strongest(weights)).toBe(vowel)
      expect(PUPPET_VOWELS.reduce((sum, candidate) => sum + weights[candidate], 0)).toBeCloseTo(1)
    }
  })

  test('should scale weights by loudness and treat silence as no vowel', () => {
    expect(analyzeVowels(new Float64Array(FRAME), RATE).level).toBe(0)
    // Loud but aperiodic: noise is unvoiced, so the mouth stays as it is.
    let seed = 7
    const noise = Float64Array.from({length: 1764}, () => {
      seed = (seed * 48_271) % 2_147_483_647
      return (seed / 2_147_483_647 - 0.5) * 0.4
    })
    expect(analyzeVowels(noise, 44_100).level).toBe(0)
    // −40 dBFS lies 40% of the way from the default −50 (silent) to −25 (full).
    const quiet = analyzeVowels(synthesize(FORMANTS[0]![1], 0.01), RATE)
    expect(quiet.level).toBeCloseTo(0.4)
    expect(quiet.weights.a).toBeLessThanOrEqual(0.4)
  })

  test('should blend mouth shapes over the current values and smooth the weights', () => {
    const document: PuppetDocument = {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      mouthShapes: {
        parameterIds: ['open', 'form'],
        vowels: Object.fromEntries(
          PUPPET_VOWELS.map((vowel, index) => [vowel, [index / 4, vowel === 'u' ? -1 : 1]]),
        ) as Record<PuppetVowel, number[]>,
      },
      parameters: [
        {defaultValue: 0, id: 'open', maximum: 1, minimum: 0, name: 'Open'},
        {defaultValue: 0, id: 'form', maximum: 1, minimum: -1, name: 'Form'},
      ],
      parts: [],
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: 1, width: 1},
    }
    expect(parseDocumentValue(document).ok).toBe(true)
    // Half "o" (open 1, form 1) and a quarter "u" (open 0.5, form −1) over open 0.2, form 0.
    const weights = toVowelWeights([0, 0, 0.25, 0, 0.5])
    expect(applyMouthShapes(document, {open: 0.2}, weights)).toEqual({
      form: 0.25,
      open: 0.2 * 0.25 + 0.125 + 0.5,
    })
    expect(normalizeVowelWeights({a: 3, i: 1, u: -1})).toEqual(toVowelWeights([0.5, 0.5]))
    const started = advanceMouthShapes({shown: toVowelWeights([]), target: weights}, 0.06)
    expect(started?.shown.o).toBeCloseTo(0.5 * (1 - Math.exp(-1)))
    expect(advanceMouthShapes({shown: toVowelWeights([0.00001])}, 1)).toBeUndefined()
    const invalid = {...document, mouthShapes: {...document.mouthShapes!, parameterIds: ['open']}}
    expect(parseDocumentValue(invalid).ok).toBe(false)
  })
})
