/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

it('should accept a Korean sentence that quotes a question mark inside dialogue', () => {
  expect(isValidLanguageLearningSentence('그는 "왜요?"라고 물었습니다.', 'ko')).toBe(true)
})

it('should accept a Japanese sentence that quotes a question mark inside dialogue', () => {
  expect(isValidLanguageLearningSentence('彼は「なぜ？」と聞きました。', 'ja')).toBe(true)
})
