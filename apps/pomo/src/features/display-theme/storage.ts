import {
  createTimestampedDualRuntimePreferenceRepository,
  createTossWebStorageAdapter,
} from 'src/utils/runtime-storage'

import {z} from 'zod'

import {
  DEFAULT_DISPLAY_THEME,
  DISPLAY_THEME_STORAGE_KEY,
  type DisplayThemePreference,
} from './model'

export interface DisplayThemePreferenceStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly removeWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface DisplayThemePreferenceRepository {
  readonly read: () => Promise<DisplayThemePreference>
  readonly write: (preference: DisplayThemePreference) => Promise<void>
}

export interface CreateDisplayThemePreferenceRepositoryOptions {
  readonly storage: DisplayThemePreferenceStorage
  readonly now?: () => number
}

const displayThemeSchema = z.enum(['bright', 'dark', 'system'])
const storedDisplayThemePreferenceSchema = z.object({
  preference: displayThemeSchema,
  savedAt: z.number().finite().nonnegative(),
})

interface StoredDisplayThemePreference {
  readonly preference: DisplayThemePreference
  readonly savedAt: number
}

export const parseDisplayThemePreference = (value: unknown): DisplayThemePreference | null => {
  const result = displayThemeSchema.safeParse(value)
  return result.success ? result.data : null
}

const parseStoredDisplayThemePreference = (value: unknown): StoredDisplayThemePreference | null => {
  const result = storedDisplayThemePreferenceSchema.safeParse(value)
  if (result.success) {
    return result.data
  }

  const preference = parseDisplayThemePreference(value)
  return preference === null ? null : {preference, savedAt: 0}
}

/** Creates the display theme persistence policy over one storage boundary. */
export const createDisplayThemePreferenceRepository = (
  options: CreateDisplayThemePreferenceRepositoryOptions,
): DisplayThemePreferenceRepository => {
  return createTimestampedDualRuntimePreferenceRepository({
    defaultValue: DEFAULT_DISPLAY_THEME,
    key: DISPLAY_THEME_STORAGE_KEY,
    now: options.now ?? Date.now,
    parseStored: parseStoredDisplayThemePreference,
    policy: 'strict-native',
    readFailureMessage: 'Failed to read display theme preference.',
    storage: {
      ...options.storage,
      writeWeb: (key, value) => {
        try {
          options.storage.writeWeb(key, value)
          return null
        } catch (error: unknown) {
          return error
        }
      },
    },
    toStored: (preference: DisplayThemePreference, savedAt) => ({preference, savedAt}),
    toValue: (stored) => stored.preference,
    writeFailureMessage: 'Failed to persist display theme preference.',
  })
}

const runtimeRepository = createDisplayThemePreferenceRepository({
  now: Date.now,
  storage: {
    ...createTossWebStorageAdapter(),
  },
})

/** Reads the display theme preference persisted for the current runtime. */
export const readDisplayThemePreference = () => runtimeRepository.read()

/** Persists the display theme preference until the host app or browser data is removed. */
export const writeDisplayThemePreference = (preference: DisplayThemePreference) =>
  runtimeRepository.write(preference)
