import {expect, it} from 'vitest'

import {selectLanguageLearningPromptWords} from '../word-selection'

it.each(['NFC', 'NFD'] as const)(
  'should reserve the second direct-word slot for a distinct word after the first %s spelling',
  (form) => {
    const first = '한글'.normalize(form)
    const duplicate = '한글'.normalize(form === 'NFC' ? 'NFD' : 'NFC')

    expect(
      selectLanguageLearningPromptWords({
        directInput: `${duplicate},단어,세번째`,
        directWords: [first],
        savedWords: [],
        source: 'direct',
      }),
    ).toEqual([first, '단어'])
  },
)

it('should return one target when the pending direct input repeats a committed word in NFD', () => {
  expect(
    selectLanguageLearningPromptWords({
      directInput: '한글'.normalize('NFD'),
      directWords: ['한글'],
      savedWords: [],
      source: 'direct',
    }),
  ).toEqual(['한글'])
})

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
