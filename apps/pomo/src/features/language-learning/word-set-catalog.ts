import {z} from 'zod'

import {
  loadPublicJson,
  type LoadPublicJsonOptions,
  type PublicAssetPath,
} from 'src/features/public-assets'

const WORD_SET_DIRECTORY = '/word-sets/'
const WORD_SET_INDEX_PATH: PublicAssetPath = `${WORD_SET_DIRECTORY}index.json`

const languageLearningWordSetIndexSchema = z.object({
  sets: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u)),
  version: z.literal(1),
})
const languageLearningWordSetLocalizedTextSchema = z.object({
  en: z.string().min(1),
  ko: z.string().min(1),
})
const languageLearningWordSetSchema = z.object({
  description: languageLearningWordSetLocalizedTextSchema,
  id: z.string().min(1),
  language: z.enum(['en', 'ja', 'ko']),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  title: languageLearningWordSetLocalizedTextSchema,
  version: z.literal(1),
  words: z.array(z.string().trim().min(1)).min(1),
})

export interface LanguageLearningWordSetIndex {
  readonly sets: ReadonlyArray<string>
  readonly version: 1
}

export type LanguageLearningWordSetLocale = 'en' | 'ko'

export interface LanguageLearningWordSetLocalizedText {
  readonly en: string
  readonly ko: string
}

export interface LanguageLearningWordSet {
  readonly description: LanguageLearningWordSetLocalizedText
  readonly id: string
  readonly language: 'en' | 'ja' | 'ko'
  readonly level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  readonly title: LanguageLearningWordSetLocalizedText
  readonly version: 1
  readonly words: ReadonlyArray<string>
}

export interface LocalizedLanguageLearningWordSet extends Omit<
  LanguageLearningWordSet,
  'description' | 'title'
> {
  readonly description: string
  readonly title: string
}

const getWordSetAssetPath = (filename: string): PublicAssetPath =>
  `${WORD_SET_DIRECTORY}${filename}`

const WORD_SET_ASSET_OPTIONS: LoadPublicJsonOptions = {
  formatFetchFailure: ({path, status}) =>
    status === undefined
      ? `Failed to fetch language learning word set asset: ${path}`
      : `Failed to fetch language learning word set asset: ${status}`,
  formatParseFailure: ({path}) => `Failed to parse language learning word set asset: ${path}`,
}

export const parseLanguageLearningWordSetIndex = (value: unknown): LanguageLearningWordSetIndex => {
  const result = languageLearningWordSetIndexSchema.safeParse(value)

  if (!result.success) {
    throw new Error('Invalid language learning word set index.', {cause: result.error})
  }

  return result.data
}

export const parseLanguageLearningWordSet = (value: unknown): LanguageLearningWordSet => {
  const result = languageLearningWordSetSchema.safeParse(value)

  if (!result.success) {
    throw new Error('Invalid language learning word set.', {cause: result.error})
  }

  return result.data
}

export const localizeLanguageLearningWordSet = (
  wordSet: LanguageLearningWordSet,
  locale: LanguageLearningWordSetLocale,
): LocalizedLanguageLearningWordSet => ({
  ...wordSet,
  description: wordSet.description[locale],
  title: wordSet.title[locale],
})

/** Loads and validates the public word set catalog in manifest order. */
export const loadLanguageLearningWordSets = async (): Promise<
  ReadonlyArray<LanguageLearningWordSet>
> => {
  const index = await loadPublicJson(
    WORD_SET_INDEX_PATH,
    parseLanguageLearningWordSetIndex,
    WORD_SET_ASSET_OPTIONS,
  )

  return Promise.all(
    index.sets.map((filename) =>
      loadPublicJson(
        getWordSetAssetPath(filename),
        parseLanguageLearningWordSet,
        WORD_SET_ASSET_OPTIONS,
      ),
    ),
  )
}
