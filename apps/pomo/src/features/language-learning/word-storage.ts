import {createCollectionStorage} from '../value-storage'
import {z} from 'zod'

import type {LanguageLearningLanguage} from './schema'
import type {LanguageLearningStorageOptions} from './storage'
import {type LanguageLearningWord, languageLearningWordSchema} from './word-schema'

const STORAGE_KEY = 'pomo:language-learning:words:v1'
export const LANGUAGE_LEARNING_WORDS_CHANGED_EVENT = 'pomo:language-learning:words-changed'
const storedWordsSchema = z.array(languageLearningWordSchema).readonly()

export interface AppendLanguageLearningWordsResult {
  readonly addedCount: number
  readonly skippedCount: number
}

const getCollectionStorage = (options?: LanguageLearningStorageOptions) =>
  createCollectionStorage({
    key: STORAGE_KEY,
    onChange: () => {
      const events = options?.events ?? globalThis
      events.dispatchEvent(new CustomEvent(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT))
    },
    parse: (value) => storedWordsSchema.parse(value),
    readFailureMessage: 'Failed to read language learning words.',
    storage: () => options?.storage ?? globalThis.localStorage,
  })

export const readLanguageLearningWords = (
  options?: LanguageLearningStorageOptions,
): ReadonlyArray<LanguageLearningWord> => getCollectionStorage(options).read()

export const writeLanguageLearningWords = (
  values: ReadonlyArray<LanguageLearningWord>,
  options?: LanguageLearningStorageOptions,
): void => getCollectionStorage(options).write(values)

export const appendLanguageLearningWords = (
  language: LanguageLearningLanguage,
  values: ReadonlyArray<string>,
  options?: LanguageLearningStorageOptions,
): AppendLanguageLearningWordsResult => {
  const storedWords = readLanguageLearningWords(options)
  const existingValues = new Set(
    storedWords
      .filter((word) => word.language === language)
      .map((word) => word.value.toLocaleLowerCase()),
  )
  const createdAt = new Date().toISOString()
  const newWords = values.flatMap((value): ReadonlyArray<LanguageLearningWord> => {
    const normalizedValue = value.toLocaleLowerCase()

    if (existingValues.has(normalizedValue)) {
      return []
    }

    existingValues.add(normalizedValue)
    return [{createdAt, language, memorized: false, value, version: 1}]
  })

  if (newWords.length > 0) {
    writeLanguageLearningWords([...storedWords, ...newWords], options)
  }

  return {
    addedCount: newWords.length,
    skippedCount: values.length - newWords.length,
  }
}

export const deleteLanguageLearningWords = (
  language: LanguageLearningLanguage,
  values: ReadonlyArray<string>,
  options?: LanguageLearningStorageOptions,
): void => {
  const selectedValues = new Set(values)
  writeLanguageLearningWords(
    readLanguageLearningWords(options).filter(
      (word) => word.language !== language || !selectedValues.has(word.value),
    ),
    options,
  )
}

export const deleteLanguageLearningWord = (
  language: LanguageLearningLanguage,
  value: string,
  options?: LanguageLearningStorageOptions,
): void => deleteLanguageLearningWords(language, [value], options)

export interface SetLanguageLearningWordMemorizedOptions {
  readonly language: LanguageLearningLanguage
  readonly memorized: boolean
  readonly value: string
}

export interface SetLanguageLearningWordsMemorizedOptions {
  readonly language: LanguageLearningLanguage
  readonly memorized: boolean
  readonly values: ReadonlyArray<string>
}

export const setLanguageLearningWordsMemorized = (
  options: SetLanguageLearningWordsMemorizedOptions,
  storageOptions?: LanguageLearningStorageOptions,
): void => {
  const selectedValues = new Set(options.values)
  writeLanguageLearningWords(
    readLanguageLearningWords(storageOptions).map((word) =>
      word.language === options.language && selectedValues.has(word.value)
        ? {...word, memorized: options.memorized}
        : word,
    ),
    storageOptions,
  )
}

export const setLanguageLearningWordMemorized = (
  options: SetLanguageLearningWordMemorizedOptions,
  storageOptions?: LanguageLearningStorageOptions,
): void =>
  setLanguageLearningWordsMemorized(
    {
      language: options.language,
      memorized: options.memorized,
      values: [options.value],
    },
    storageOptions,
  )
