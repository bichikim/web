import {z} from 'zod'

import {readWebStorageJson, writeWebStorageJson} from '../runtime-storage'
import type {LanguageLearningWordSource} from './word-selection'

const STORAGE_KEY = 'pomo:language-learning:word-source:v1'
const wordSourcePreferenceSchema = z.object({
  source: z.enum(['direct', 'saved']),
  version: z.literal(1),
})

const parseWordSourcePreference = (value: unknown): LanguageLearningWordSource | null => {
  const result = wordSourcePreferenceSchema.safeParse(value)
  return result.success ? result.data.source : null
}

/** Reads the last word source selected in the learning editor. */
export const readLanguageLearningWordSource = (): LanguageLearningWordSource =>
  readWebStorageJson(STORAGE_KEY, parseWordSourcePreference) ?? 'direct'

/** Remembers the word source selected in the learning editor. */
export const writeLanguageLearningWordSource = (source: LanguageLearningWordSource): void => {
  writeWebStorageJson(STORAGE_KEY, {source, version: 1})
}
