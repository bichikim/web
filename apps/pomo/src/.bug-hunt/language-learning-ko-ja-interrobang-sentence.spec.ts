/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

it('should accept a Korean sentence ending with ?!', () => {
  expect(isValidLanguageLearningSentence('정말 그래요?!', 'ko')).toBe(true)
})

it('should accept a Japanese sentence ending with ?!', () => {
  expect(isValidLanguageLearningSentence('本当にそうですか?!', 'ja')).toBe(true)
})

it('should accept a Korean sentence ending with fullwidth ？！', () => {
  expect(isValidLanguageLearningSentence('정말 그래요？！', 'ko')).toBe(true)
})
