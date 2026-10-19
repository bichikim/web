import {expect, it} from 'vitest'
import {splitReferenceSpeechText} from './fixtures/text-chunking'
import {splitSpeechText} from '../text-chunking'

it('should preserve native browser Unicode and paragraph chunking', () => {
  const policy = Object.freeze({
    considerSplitLength: 120,
    locale: 'ko',
    maximumLength: 200,
    recommendedLength: 150,
    silenceDuration: 0.3,
  })
  const tailLength = 100
  const textChunks = splitSpeechText(
    `${'😀'.repeat(policy.recommendedLength + tailLength)}\n\n다음 문단`,
    policy,
  )
  expect(textChunks).toEqual([
    '😀'.repeat(policy.recommendedLength),
    '😀'.repeat(tailLength),
    '다음 문단',
  ])
  const text = `${'😀'.repeat(policy.recommendedLength + tailLength)}\r\n다음 줄\n \t\n${'e\u0301'.repeat(tailLength)}`
  expect(splitSpeechText(text, policy)).toEqual(splitReferenceSpeechText(text, policy))
})
