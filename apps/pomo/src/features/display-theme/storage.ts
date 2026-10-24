import {
  createTimestampedDualRuntimePreferenceRepository,
  createTimestampedFieldCodec,
  createTossWebStorageAdapter,
  type TimestampedPreferenceStorage,
} from 'src/utils/runtime-storage'

import {z} from 'zod'

import {
  DEFAULT_DISPLAY_THEME,
  DISPLAY_THEME_STORAGE_KEY,
  type DisplayThemePreference,
} from './model'

export type DisplayThemePreferenceStorage = TimestampedPreferenceStorage

export interface DisplayThemePreferenceRepository {
  readonly read: () => Promise<DisplayThemePreference>
  readonly write: (preference: DisplayThemePreference) => Promise<void>
}

export interface CreateDisplayThemePreferenceRepositoryOptions {
  readonly storage: DisplayThemePreferenceStorage
  readonly now?: () => number
}

const displayThemeSchema = z.enum(['bright', 'dark', 'system'])
const codec = createTimestampedFieldCodec('preference', displayThemeSchema)
export const parseDisplayThemePreference = codec.parseValue

/** Creates the display theme persistence policy over one storage boundary. */
export const createDisplayThemePreferenceRepository = (
  options: CreateDisplayThemePreferenceRepositoryOptions,
): DisplayThemePreferenceRepository => {
  return createTimestampedDualRuntimePreferenceRepository({
    defaultValue: DEFAULT_DISPLAY_THEME,
    key: DISPLAY_THEME_STORAGE_KEY,
    now: options.now ?? Date.now,
    ...codec,
    policy: 'strict-native',
    readFailureMessage: 'Failed to read display theme preference.',
    storage: options.storage,
    writeFailureMessage: 'Failed to persist display theme preference.',
  })
}

const runtimeRepository = createDisplayThemePreferenceRepository({
  now: Date.now,
  storage: createTossWebStorageAdapter({writeWebMode: 'return-error'}),
})

/** Reads the display theme preference persisted for the current runtime. */
export const readDisplayThemePreference = () => runtimeRepository.read()

/** Persists the display theme preference until the host app or browser data is removed. */
export const writeDisplayThemePreference = (preference: DisplayThemePreference) =>
  runtimeRepository.write(preference)
