import {getRequestEvent} from 'solid-js/web'
import {z} from 'zod'

const WORD_SET_DIRECTORY = '/word-sets/'
const WORD_SET_INDEX_PATH = `${WORD_SET_DIRECTORY}index.json`

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

const getWordSetAssetUrl = (path: string): string => {
  const requestUrl = getRequestEvent()?.request.url
  return requestUrl === undefined ? path : new URL(path, requestUrl).href
}

const loadJsonAsset = async (path: string): Promise<unknown> => {
  let response: Response

  try {
    response = await fetch(getWordSetAssetUrl(path))
  } catch (error: unknown) {
    throw new Error(`Failed to fetch language learning word set asset: ${path}`, {cause: error})
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch language learning word set asset: ${response.status}`)
  }

  try {
    return await response.json()
  } catch (error: unknown) {
    throw new Error(`Failed to parse language learning word set asset: ${path}`, {cause: error})
  }
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
  const index = parseLanguageLearningWordSetIndex(await loadJsonAsset(WORD_SET_INDEX_PATH))

  return Promise.all(
    index.sets.map(async (filename) =>
      parseLanguageLearningWordSet(await loadJsonAsset(`${WORD_SET_DIRECTORY}${filename}`)),
    ),
  )
}
