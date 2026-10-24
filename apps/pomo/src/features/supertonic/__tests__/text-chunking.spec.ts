/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import type {SupertonicSpeechPolicy} from '../model'
import {splitSpeechText} from '../text-chunking'
import {splitReferenceSpeechText} from './fixtures/text-chunking'

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

  it('should treat single line breaks as soft boundaries', () => {
    expect(
      splitSpeechText('아이고 \r\n 여기가 마지막인가\n이제 정말!! 조금만 힘내자', POLICY),
    ).toEqual(['아이고 여기가 마지막인가 이제 정말!! 조금만 힘내자'])
  })

  it('should preserve blank lines as paragraph boundaries', () => {
    expect(splitSpeechText('첫 번째 문단입니다.\n\n두 번째 문단입니다.', POLICY)).toEqual([
      '첫 번째 문단입니다.',
      '두 번째 문단입니다.',
    ])
  })

  it('should not merge adjacent text beyond the recommended length', () => {
    const shortLine = '가'.repeat(15)
    const nextLine = '나'.repeat(POLICY.recommendedLength - shortLine.length)

    expect(splitSpeechText(`${shortLine}\n${nextLine}`, POLICY)).toEqual([shortLine, nextLine])
  })

  it('should merge adjacent text through the recommended length', () => {
    const shortLine = '가'.repeat(15)
    const separatorLength = 1
    const nextLine = '나'.repeat(POLICY.recommendedLength - shortLine.length - separatorLength)

    expect(splitSpeechText(`${shortLine}\n${nextLine}`, POLICY)).toEqual([
      `${shortLine} ${nextLine}`,
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

  it('should split without empty chunks when the recommendation exceeds the maximum', () => {
    const policy = {...POLICY, considerSplitLength: 1, maximumLength: 5, recommendedLength: 6}
    const text = '가'.repeat(6)

    const chunks = splitSpeechText(text, policy)

    expect(chunks.every((chunk) => Array.from(chunk).length > 0)).toBe(true)
    expect(chunks.every((chunk) => Array.from(chunk).length <= policy.maximumLength)).toBe(true)
    expect(chunks.join('')).toBe(text)
  })

  it('should split oversized sentences near the recommendation at a word boundary', () => {
    const chunks = splitSpeechText(Array.from({length: 80}, () => '긴문장').join(' '), POLICY)

    expect(chunks[0]?.length).toBeLessThanOrEqual(POLICY.recommendedLength)
    expect(chunks.every((chunk) => chunk.length <= POLICY.maximumLength)).toBe(true)
  })

  it('should prefer a later word boundary over splitting a word', () => {
    const firstPart = '가'.repeat(POLICY.recommendedLength + 10)
    const secondPart = '나'.repeat(50)

    expect(splitSpeechText(`${firstPart} ${secondPart}`, POLICY)).toEqual([firstPart, secondPart])
  })

  it('should tolerate a zero split consideration boundary from runtime policy data', () => {
    const policy = {...POLICY, considerSplitLength: 0, maximumLength: 3, recommendedLength: 1}

    expect(splitSpeechText('가나다라', policy)).toEqual(['가', '나다라'])
  })

  it('should enforce a runtime maximum shorter than the recommendation', () => {
    const policy = {...POLICY, maximumLength: 4, recommendedLength: 10}

    expect(splitSpeechText('하나. 둘.', policy)).toEqual(['하나.', '둘.'])
  })

  it.each([0, 1, 119, 120, 149, 150, 151, 199, 200, 201, 299, 300, 301, 549])(
    'should preserve code point boundaries and final chunks for %i characters',
    (length) => {
      const policy = Object.freeze({...POLICY})
      const text = '😀'.repeat(length)
      const chunks = splitSpeechText(text, policy)

      expect(chunks).toEqual(splitReferenceSpeechText(text, policy))
      expect(chunks.join('')).toBe(text)
      expect(chunks.every((chunk) => Array.from(chunk).length <= policy.maximumLength)).toBe(true)
      expect(policy).toEqual(POLICY)
    },
  )

  it.each([
    POLICY,
    {...POLICY, considerSplitLength: 0},
    {...POLICY, considerSplitLength: 1, maximumLength: 5, recommendedLength: 6},
    {...POLICY, maximumLength: 4, recommendedLength: 10},
    {...POLICY, considerSplitLength: 1, maximumLength: 7.5, recommendedLength: 5.5},
    {...POLICY, considerSplitLength: 1, recommendedLength: -1},
  ])(
    'should match original splitting for seeded Unicode and whitespace with policy %j',
    (policy) => {
      const frozenPolicy = Object.freeze({...policy})
      const tokens = [
        '가',
        '漢',
        'a',
        '😀',
        'é',
        'e\u0301',
        '\uD800',
        '\uDC00',
        '\u200D',
        ' ',
        '\t',
        '\u00A0',
        '\n',
        '\r\n',
        '\n\n',
        ',',
        ';',
        ':',
        '!',
        '?',
        '。',
        '，',
      ]

      expect(splitSpeechText('가'.repeat(549), frozenPolicy)).toEqual(
        splitReferenceSpeechText('가'.repeat(549), frozenPolicy),
      )

      for (let seed = 1; seed <= 32; seed += 1) {
        const text = Array.from({length: (seed * 73) % 900}, (_, index) => {
          const position = Math.abs(
            Math.imul(index + seed, 0x45d9f3b) + Math.imul(seed, 0x27d4eb2d),
          )
          return tokens[position % tokens.length]
        }).join('')

        expect(splitSpeechText(text, frozenPolicy)).toEqual(
          splitReferenceSpeechText(text, frozenPolicy),
        )
      }

      expect(frozenPolicy).toEqual(policy)
    },
  )

  it.each([
    `${'가'.repeat(124)},${'나'.repeat(120)}`,
    `${'가'.repeat(150)} ${'나'.repeat(100)}`,
    `${'가'.repeat(160)} ${'나'.repeat(100)}`,
    `${'가'.repeat(200)} ${'나'.repeat(100)}`,
    ` \t${'😀'.repeat(220)}\r\n다음 줄\n \t\n${'e\u0301'.repeat(160)}\u00A0 `,
  ])('should preserve break priority, trimming, and paragraph packing for %s', (text) => {
    expect(splitSpeechText(text, POLICY)).toEqual(splitReferenceSpeechText(text, POLICY))
  })

  it('should preserve the invalid locale exception', () => {
    const policy = Object.freeze({...POLICY, locale: 'invalid_locale'})

    expect(() => splitReferenceSpeechText('가'.repeat(250), policy)).toThrow(RangeError)
    expect(() => splitSpeechText('가'.repeat(250), policy)).toThrow(RangeError)
  })

  it.each([-0.5, 0, Number.NaN])(
    'should preserve nonprogressing runtime recommendation %s',
    (recommendedLength) => {
      const policy = Object.freeze({
        ...POLICY,
        considerSplitLength: 1,
        maximumLength: 3,
        recommendedLength,
      })
      const stop = new Error('bounded nonprogress probe')
      const originalSlice = Array.prototype.slice
      const probe = (split: typeof splitSpeechText) => {
        let copies = 0
        const spy = vi.spyOn(Array.prototype, 'slice').mockImplementation(function spy(
          this: ReadonlyArray<unknown>,
          start?: number,
          end?: number,
        ) {
          copies += 1
          if (copies > 8) {
            throw stop
          }
          return originalSlice.call(this, start, end)
        })
        try {
          return split('가나다라마바', policy)
        } catch (error) {
          return error
        } finally {
          spy.mockRestore()
        }
      }

      expect(probe(splitReferenceSpeechText)).toBe(stop)
      expect(probe(splitSpeechText)).toBe(stop)
    },
  )
})
