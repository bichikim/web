import {expect, it} from 'vitest'

import {selectLanguageLearningPromptWords} from '../word-selection'

it('should split semicolon-delimited direct input and keep its two-word limit', () => {
  expect(
    selectLanguageLearningPromptWords({
      directInput: 'one;two;three',
      directWords: [],
      savedWords: [],
      source: 'direct',
    }),
  ).toEqual(['one', 'two'])
})
