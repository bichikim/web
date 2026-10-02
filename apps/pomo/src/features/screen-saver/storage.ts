import {
  createTimestampedDualRuntimePreferenceRepository,
  createTossWebStorageAdapter,
} from 'src/utils/runtime-storage'

import {z} from 'zod'

import type {ScreenSaverDelay} from './model'

export const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
export const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = import.meta.env.DEV
  ? z.enum(['off', '5s', '1m', '10m', '20m', '1h'])
  : z.enum(['off', '1m', '10m', '20m', '1h'])
const storedScreenSaverPreferenceSchema = z.object({
  delay: screenSaverDelaySchema,
  savedAt: z.number().finite().nonnegative(),
})

interface StoredScreenSaverPreference {
  readonly delay: ScreenSaverDelay
  readonly savedAt: number
}

export const parseScreenSaverDelay = (value: unknown): ScreenSaverDelay | null => {
  const result = screenSaverDelaySchema.safeParse(value)
  return result.success ? result.data : null
}

const parseStoredScreenSaverPreference = (value: unknown): StoredScreenSaverPreference | null => {
  const result = storedScreenSaverPreferenceSchema.safeParse(value)
  if (result.success) {
    return result.data
  }

  const delay = parseScreenSaverDelay(value)
  return delay === null ? null : {delay, savedAt: 0}
}

export interface ScreenSaverStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown>
  readonly readWeb: (key: string) => unknown
  /** Returns the storage error on failure, or null on success. */
  readonly removeWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  /** Returns the storage error on failure, or null on success. */
  readonly writeWeb: (key: string, value: unknown) => unknown | null
}

export interface ScreenSaverRepository {
  readonly read: () => Promise<ScreenSaverDelay>
  readonly write: (delay: ScreenSaverDelay) => Promise<void>
}

/** Reads and writes screen saver settings using the supplied runtime storage. */
export const createScreenSaverRepository = (
  storage: ScreenSaverStorage,
  now: () => number = Date.now,
): ScreenSaverRepository => {
  return createTimestampedDualRuntimePreferenceRepository({
    defaultValue: DEFAULT_SCREEN_SAVER_DELAY,
    key: SCREEN_SAVER_STORAGE_KEY,
    now: now,
    parseStored: parseStoredScreenSaverPreference,
    policy: 'recover-web',
    readFailureMessage: 'Failed to read screen saver delay.',
    storage: storage,
    toStored: (delay: ScreenSaverDelay, savedAt) => ({delay, savedAt}),
    toValue: (stored) => stored.delay,
    writeFailureMessage: 'Failed to persist screen saver delay.',
  })
}

const runtimeRepository = createScreenSaverRepository(
  {
    ...createTossWebStorageAdapter({writeWebMode: 'return-error'}),
  },
  Date.now,
)

/** Reads the screen saver delay persisted for the current runtime. */
export const readScreenSaverDelay = (): Promise<ScreenSaverDelay> => runtimeRepository.read()

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = (delay: ScreenSaverDelay): Promise<void> =>
  runtimeRepository.write(delay)
