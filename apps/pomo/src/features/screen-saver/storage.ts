import {
  createTimestampedDualRuntimePreferenceRepository,
  createTimestampedFieldCodec,
  createTossWebStorageAdapter,
  type TimestampedPreferenceStorage,
} from 'src/utils/runtime-storage'

import {z} from 'zod'

import type {ScreenSaverDelay} from './model'

export const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
export const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = import.meta.env.DEV
  ? z.enum(['off', '5s', '1m', '10m', '20m', '1h'])
  : z.enum(['off', '1m', '10m', '20m', '1h'])
const codec = createTimestampedFieldCodec<'delay', ScreenSaverDelay>(
  'delay',
  screenSaverDelaySchema,
)
export const parseScreenSaverDelay = codec.parseValue

export type ScreenSaverStorage = TimestampedPreferenceStorage

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
    ...codec,
    policy: 'recover-web',
    readFailureMessage: 'Failed to read screen saver delay.',
    storage: storage,
    writeFailureMessage: 'Failed to persist screen saver delay.',
  })
}

const runtimeRepository = createScreenSaverRepository(
  createTossWebStorageAdapter({writeWebMode: 'return-error'}),
  Date.now,
)

/** Reads the screen saver delay persisted for the current runtime. */
export const readScreenSaverDelay = (): Promise<ScreenSaverDelay> => runtimeRepository.read()

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = (delay: ScreenSaverDelay): Promise<void> =>
  runtimeRepository.write(delay)
