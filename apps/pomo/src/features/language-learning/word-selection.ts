import {parseLanguageLearningTags} from './tags'
import type {LanguageLearningLanguage} from './schema'
import type {LanguageLearningWord} from './word-schema'

export const MAXIMUM_DIRECT_LANGUAGE_LEARNING_WORDS = 2
export const MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS = 3
export const MAXIMUM_RANDOM_LANGUAGE_LEARNING_WORDS = 10

export type LanguageLearningWordSource = 'direct' | 'saved'

export interface GetUnmemorizedLanguageLearningWordValuesOptions {
  readonly language: LanguageLearningLanguage
  readonly words: ReadonlyArray<LanguageLearningWord>
}

export const getUnmemorizedLanguageLearningWordValues = (
  options: GetUnmemorizedLanguageLearningWordValuesOptions,
): ReadonlyArray<string> =>
  options.words
    .filter((word) => word.language === options.language && !word.memorized)
    .map((word) => word.value)

export interface SelectRandomLanguageLearningWordsOptions {
  readonly random?: () => number
  readonly values: ReadonlyArray<string>
}

export const selectRandomLanguageLearningWords = (
  options: SelectRandomLanguageLearningWordsOptions,
): ReadonlyArray<string> => {
  if (options.values.length < MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS) {
    return []
  }

  const random = options.random ?? Math.random
  const maximumCount = Math.min(options.values.length, MAXIMUM_RANDOM_LANGUAGE_LEARNING_WORDS)
  const countRange = maximumCount - MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS + 1
  const count = MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS + Math.floor(random() * countRange)
  const shuffledValues = [...options.values]

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1))
    const currentValue = shuffledValues[index]
    shuffledValues[index] = shuffledValues[targetIndex]
    shuffledValues[targetIndex] = currentValue
  }

  return shuffledValues.slice(0, count)
}

export interface SelectLanguageLearningPromptWordsOptions {
  readonly directInput: string
  readonly directWords: ReadonlyArray<string>
  readonly random?: () => number
  readonly savedWords: ReadonlyArray<string>
  readonly source: LanguageLearningWordSource
}

export const selectLanguageLearningPromptWords = (
  options: SelectLanguageLearningPromptWordsOptions,
): ReadonlyArray<string> => {
  if (options.source === 'saved') {
    return selectRandomLanguageLearningWords({
      random: options.random,
      values: options.savedWords,
    })
  }

  return parseLanguageLearningTags([...options.directWords, options.directInput].join(',')).slice(
    0,
    MAXIMUM_DIRECT_LANGUAGE_LEARNING_WORDS,
  )
}
