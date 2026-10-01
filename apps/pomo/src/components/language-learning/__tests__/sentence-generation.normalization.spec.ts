/** @vitest-environment node */
import {expect, it} from 'vitest'

import {resolveSentenceGeneration} from '../sentence-generation'

it.each([
  ['en', '3.5 million people visit the park each year.'],
  ['ko', '1.5배 빠르게 달릴 수 있어요.'],
] as const)(
  'should preserve leading decimal values in generated sentences (%s)',
  (language, output) => {
    expect(
      resolveSentenceGeneration({
        count: 1,
        language,
        output,
        retryCount: 0,
        sentences: [],
      }),
    ).toEqual({kind: 'complete', sentences: [output]})
  },
)

it.each([
  ['1. The cat sleeps.', 'The cat sleeps.'],
  ['2) The cat sleeps.', 'The cat sleeps.'],
  ['- The cat sleeps.', 'The cat sleeps.'],
  ['* The cat sleeps.', 'The cat sleeps.'],
  ['• The cat sleeps.', 'The cat sleeps.'],
] as const)(
  'should normalize genuine list markers during sentence generation (%s)',
  (output, sentence) => {
    expect(
      resolveSentenceGeneration({
        count: 1,
        language: 'en',
        output,
        retryCount: 0,
        sentences: [],
      }),
    ).toEqual({kind: 'complete', sentences: [sentence]})
  },
)
