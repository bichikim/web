/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

it('should accept an English sentence that contains an abbreviation before the final period', () => {
  expect(isValidLanguageLearningSentence('Dr. Smith went home.', 'en')).toBe(true)
})
