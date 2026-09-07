import {expect, it, vi} from 'vitest'

import {
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
} from '../../../features/language-learning'
import {resolveSentenceGeneration} from '../sentence-generation'

vi.mock('../../../features/language-learning', () => ({
  isValidLanguageLearningSentence: vi.fn(),
  normalizeLanguageLearningSentence: vi.fn(),
}))

it('should normalize and continue until every requested sentence is ready', () => {
  vi.mocked(normalizeLanguageLearningSentence).mockReturnValue('Normalized sentence.')
  vi.mocked(isValidLanguageLearningSentence).mockReturnValue(true)

  expect(
    resolveSentenceGeneration({
      count: 2,
      language: 'en',
      output: ' raw ',
      retryCount: 1,
      sentences: [],
    }),
  ).toEqual({kind: 'continue', sentences: ['Normalized sentence.']})
  expect(
    resolveSentenceGeneration({
      count: 2,
      language: 'en',
      output: ' raw ',
      retryCount: 0,
      sentences: ['First sentence.'],
    }),
  ).toEqual({kind: 'complete', sentences: ['First sentence.', 'Normalized sentence.']})
})

it('should retry invalid sentences twice before reporting failure', () => {
  vi.mocked(normalizeLanguageLearningSentence).mockReturnValue('Invalid')
  vi.mocked(isValidLanguageLearningSentence).mockReturnValue(false)

  expect(
    resolveSentenceGeneration({
      count: 1,
      language: 'en',
      output: 'Invalid',
      retryCount: 0,
      sentences: [],
    }),
  ).toEqual({kind: 'retry', retryCount: 1})
  expect(
    resolveSentenceGeneration({
      count: 1,
      language: 'en',
      output: 'Invalid',
      retryCount: 1,
      sentences: [],
    }),
  ).toEqual({kind: 'retry', retryCount: 2})
  expect(
    resolveSentenceGeneration({
      count: 1,
      language: 'en',
      output: 'Invalid',
      retryCount: 2,
      sentences: [],
    }),
  ).toEqual({kind: 'invalid'})
})
