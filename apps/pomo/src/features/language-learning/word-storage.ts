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

export const readLanguageLearningWords = (
  options?: LanguageLearningStorageOptions,
): ReadonlyArray<LanguageLearningWord> => {
  try {
    const stored = (options?.storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    return stored === null ? [] : storedWordsSchema.parse(JSON.parse(stored))
  } catch (error: unknown) {
    console.warn('Failed to read language learning words.', error)
    return []
  }
}

export const writeLanguageLearningWords = (
  words: ReadonlyArray<LanguageLearningWord>,
  options?: LanguageLearningStorageOptions,
): void => {
  const parsed = storedWordsSchema.parse(words)
  const storage = options?.storage ?? globalThis.localStorage
  storage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  const events = options?.events ?? globalThis
  events.dispatchEvent(new CustomEvent(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT))
}

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
