import {createCollectionStorage} from '../value-storage'
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

const getCollectionStorage = (options?: LanguageLearningStorageOptions) =>
  createCollectionStorage({
    key: STORAGE_KEY,
    onChange: () => {
      const events = options?.events ?? globalThis
      events.dispatchEvent(new CustomEvent(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT))
    },
    parse: (value) => storedSentencesSchema.parse(value),
    readFailureMessage: 'Failed to read language learning sentences.',
    storage: () => options?.storage ?? globalThis.localStorage,
  })

export const readLanguageLearningSentences = (
  options?: LanguageLearningStorageOptions,
): ReadonlyArray<LanguageLearningSentence> => getCollectionStorage(options).read()

export const writeLanguageLearningSentences = (
  values: ReadonlyArray<LanguageLearningSentence>,
  options?: LanguageLearningStorageOptions,
): void => getCollectionStorage(options).write(values)

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
