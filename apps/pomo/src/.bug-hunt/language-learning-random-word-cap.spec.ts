/** @vitest-environment node */
import {expect, it} from 'vitest'

import {selectRandomLanguageLearningWords} from '../features/language-learning/word-selection'

it('should never return more words than MAXIMUM_RANDOM_LANGUAGE_LEARNING_WORDS', () => {
  const values = Array.from({length: 11}, (_, index) => `word-${index}`)

  expect(
    selectRandomLanguageLearningWords({
      random: () => 1,
      values,
    }).length,
  ).toBeLessThanOrEqual(10)
})
