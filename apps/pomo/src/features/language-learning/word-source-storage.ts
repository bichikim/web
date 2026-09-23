import {z} from 'zod'

import type {PreferenceStorage} from 'src/utils/preference-storage'
import {readWebStorageJson, writeWebStorageJson} from 'src/utils/runtime-storage'
import type {LanguageLearningWordSource} from './word-selection'

export const LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY = 'pomo:language-learning:word-source:v1'
const wordSourcePreferenceSchema = z.object({
  source: z.enum(['direct', 'saved']),
  version: z.literal(1),
})
const wordSourceSchema = z.enum(['direct', 'saved'])

export const parseLanguageLearningWordSourcePreference = (
  value: unknown,
): LanguageLearningWordSource | null => {
  const result = wordSourcePreferenceSchema.safeParse(value)
  return result.success ? result.data.source : null
}

export const parseLanguageLearningWordSource = (
  value: unknown,
): LanguageLearningWordSource | null => {
  const result = wordSourceSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Adapts the versioned word-source record to the shared preference provider. */
export const languageLearningWordSourcePreferenceStorage: PreferenceStorage = {
  read: (key) => readWebStorageJson(key, parseLanguageLearningWordSourcePreference),
  write: (key, value) => {
    const source = parseLanguageLearningWordSource(value)
    return source === null ? null : writeWebStorageJson(key, {source, version: 1})
  },
}

/** Reads the last word source selected in the learning editor. */
export const readLanguageLearningWordSource = (): LanguageLearningWordSource =>
  readWebStorageJson(
    LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY,
    parseLanguageLearningWordSourcePreference,
  ) ?? 'direct'

/** Remembers the word source selected in the learning editor. */
export const writeLanguageLearningWordSource = (source: LanguageLearningWordSource): void => {
  writeWebStorageJson(LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY, {source, version: 1})
}
