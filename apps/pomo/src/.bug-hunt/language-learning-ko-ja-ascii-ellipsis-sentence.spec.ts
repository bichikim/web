/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

const sentence = '기다려요...'

it('should accept the same ascii ellipsis sentence in Korean as in English', () => {
  expect(isValidLanguageLearningSentence(sentence, 'en')).toBe(true)
  expect(isValidLanguageLearningSentence(sentence, 'ko')).toBe(true)
})

it('should accept a Japanese sentence ending with ascii ellipsis', () => {
  expect(isValidLanguageLearningSentence('待ってください...', 'ja')).toBe(true)
})
