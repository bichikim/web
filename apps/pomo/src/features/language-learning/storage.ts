import {z} from 'zod'

import {type LanguageLearningSentence, languageLearningSentenceSchema} from './schema'

const STORAGE_KEY = 'pomo:language-learning:sentences:v1'
export const LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT = 'pomo:language-learning:sentences-changed'
const storedSentencesSchema = z.array(languageLearningSentenceSchema).readonly()

export interface LanguageLearningStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export type LanguageLearningEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'dispatchEvent' | 'removeEventListener'
>

export interface LanguageLearningStorageOptions {
  readonly events?: LanguageLearningEventTarget
  readonly storage?: LanguageLearningStorage
}

const getStorage = (storage?: LanguageLearningStorage): LanguageLearningStorage =>
  storage ?? globalThis.localStorage

const getEvents = (events?: LanguageLearningEventTarget): LanguageLearningEventTarget =>
  events ?? globalThis

export const readLanguageLearningSentences = (
  options?: LanguageLearningStorageOptions,
): ReadonlyArray<LanguageLearningSentence> => {
  try {
    const stored = getStorage(options?.storage).getItem(STORAGE_KEY)
    return stored === null ? [] : storedSentencesSchema.parse(JSON.parse(stored))
  } catch (error: unknown) {
    console.warn('Failed to read language learning sentences.', error)
    return []
  }
}

export const writeLanguageLearningSentences = (
  sentences: ReadonlyArray<LanguageLearningSentence>,
  options?: LanguageLearningStorageOptions,
): void => {
  const parsed = storedSentencesSchema.parse(sentences)
  getStorage(options?.storage).setItem(STORAGE_KEY, JSON.stringify(parsed))
  getEvents(options?.events).dispatchEvent(
    new CustomEvent(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT),
  )
}

export const appendLanguageLearningSentences = (
  sentences: ReadonlyArray<LanguageLearningSentence>,
  options?: LanguageLearningStorageOptions,
): void =>
  writeLanguageLearningSentences([...readLanguageLearningSentences(options), ...sentences], options)

export const deleteLanguageLearningSentence = (
  dialogueId: string,
  options?: LanguageLearningStorageOptions,
): void =>
  writeLanguageLearningSentences(
    readLanguageLearningSentences(options).filter((sentence) => sentence.dialogueId !== dialogueId),
    options,
  )
