import {z} from 'zod'

import {createBestEffortValueStorage, createJsonCodec, type ValueCodec} from '../value-storage'
import {POMODORO_TIMER_LIMITS} from './limits'
import {type PomodoroTimerConfig, type PomodoroTimerState} from './model'

export const POMODORO_TIMER_STORAGE_KEY = 'pomo:timer:v1'
export const POMODORO_TIMER_CONFIG_STORAGE_KEY = 'pomo:timer-config:v1'

const SECONDS_PER_MINUTE = 60
const MAX_DURATION_SECONDS = POMODORO_TIMER_LIMITS.maxDurationMinutes * SECONDS_PER_MINUTE
const phaseSchema = z.union([z.literal('focus'), z.literal('longBreak'), z.literal('shortBreak')])
const stateBaseSchema = {
  completedFocusSessions: z.number().int().nonnegative(),
  phase: phaseSchema,
}

export const pomodoroTimerStateSchema = z.discriminatedUnion('status', [
  z.object({
    ...stateBaseSchema,
    remainingSeconds: z.number().int().nonnegative(),
    status: z.literal('idle'),
  }),
  z.object({
    ...stateBaseSchema,
    remainingSeconds: z.number().int().positive(),
    status: z.literal('paused'),
  }),
  z.object({
    ...stateBaseSchema,
    endsAt: z.number().positive(),
    status: z.literal('running'),
  }),
])

export const pomodoroTimerConfigSchema = z.object({
  focusSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
  focusSessionsPerCycle: z.number().int().positive().max(POMODORO_TIMER_LIMITS.maxFocusSessions),
  longBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
  shortBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
})

export interface PomodoroTimerStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: PomodoroTimerStorage): PomodoroTimerStorage =>
  storage ?? globalThis.localStorage

const stateCodec = createJsonCodec((value) => {
  const result = pomodoroTimerStateSchema.safeParse(value)
  return result.success ? result.data : null
})
const configCodec = createJsonCodec((value) => {
  const result = pomodoroTimerConfigSchema.safeParse(value)
  return result.success ? result.data : null
})

const createTimerStorage = <Value>(
  key: string,
  codec: ValueCodec<Value>,
  storage?: PomodoroTimerStorage,
) =>
  createBestEffortValueStorage({
    ...codec,
    key,
    storage: () => getStorage(storage),
  })

/** Reads a persisted timer state and returns null for unavailable or invalid data. */
export const readPomodoroTimerState = (storage?: PomodoroTimerStorage): PomodoroTimerState | null =>
  createTimerStorage(POMODORO_TIMER_STORAGE_KEY, stateCodec, storage).read()

/** Persists a timer state while allowing timer operation when storage is unavailable. */
export const writePomodoroTimerState = (
  state: PomodoroTimerState,
  storage?: PomodoroTimerStorage,
): void => {
  createTimerStorage(POMODORO_TIMER_STORAGE_KEY, stateCodec, storage).write(state)
}

/** Reads a persisted timer configuration and returns null for unavailable or invalid data. */
export const readPomodoroTimerConfig = (
  storage?: PomodoroTimerStorage,
): PomodoroTimerConfig | null =>
  createTimerStorage(POMODORO_TIMER_CONFIG_STORAGE_KEY, configCodec, storage).read()

/** Persists a timer configuration while allowing timer operation when storage is unavailable. */
export const writePomodoroTimerConfig = (
  config: PomodoroTimerConfig,
  storage?: PomodoroTimerStorage,
): void => {
  createTimerStorage(POMODORO_TIMER_CONFIG_STORAGE_KEY, configCodec, storage).write(config)
}
