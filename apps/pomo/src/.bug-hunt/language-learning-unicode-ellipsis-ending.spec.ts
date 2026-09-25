/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

it.each([
  ['ko', '오늘은 정말 바빴습니다…'],
  ['ja', '今日は本当に忙しかった…'],
  ['en', 'I was really busy today…'],
] as const)(
  'should accept a single sentence ending with a unicode ellipsis (%s)',
  (language, sentence) => {
    expect(isValidLanguageLearningSentence(sentence, language)).toBe(true)
  },
)
