import {describe, expect, it} from 'vitest'

import type {SupertonicSpeechPolicy} from '../model'
import {splitSpeechText} from '../text-chunking'

const POLICY: SupertonicSpeechPolicy = {
  considerSplitLength: 120,
  locale: 'ko',
  maximumLength: 200,
  recommendedLength: 150,
  silenceDuration: 0.3,
}

describe('splitSpeechText', () => {
  it('should preserve short text as one chunk', () => {
    expect(splitSpeechText('첫 번째 문장입니다. 두 번째 문장입니다.', POLICY)).toEqual([
      '첫 번째 문장입니다. 두 번째 문장입니다.',
    ])
  })

  it('should prefer sentence boundaries after the split consideration length', () => {
    const firstSentence = `${'가'.repeat(124)}.`
    const secondSentence = `${'나'.repeat(39)}.`

    expect(splitSpeechText(`${firstSentence} ${secondSentence}`, POLICY)).toEqual([
      firstSentence,
      secondSentence,
    ])
  })

  it('should enforce the maximum length for a sentence without natural boundaries', () => {
    const chunks = splitSpeechText('가'.repeat(549), POLICY)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]).toHaveLength(POLICY.recommendedLength)
    expect(chunks.every((chunk) => Array.from(chunk).length <= POLICY.maximumLength)).toBe(true)
    expect(chunks.join('')).toBe('가'.repeat(549))
  })

  it('should split oversized sentences near the recommendation at a word boundary', () => {
    const chunks = splitSpeechText(Array.from({length: 80}, () => '긴문장').join(' '), POLICY)

    expect(chunks[0]?.length).toBeLessThanOrEqual(POLICY.recommendedLength)
    expect(chunks.every((chunk) => chunk.length <= POLICY.maximumLength)).toBe(true)
  })
})
