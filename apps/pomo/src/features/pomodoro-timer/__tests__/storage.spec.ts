/** @vitest-environment node */

import {afterEach, expect, it, vi} from 'vitest'

import {type PomodoroTimerConfig, type PomodoroTimerState, stopPomodoroTimer} from '../model'
import {
  type PomodoroTimerStorage,
  readPomodoroTimerConfig,
  readPomodoroTimerState,
  writePomodoroTimerConfig,
  writePomodoroTimerState,
} from '../storage'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

const STATE = {
  completedFocusSessions: 1,
  phase: 'shortBreak',
  remainingSeconds: 4,
  status: 'paused',
} satisfies PomodoroTimerState

const RUNNING_STATE = {
  completedFocusSessions: 0,
  endsAt: 1_000,
  phase: 'focus',
  status: 'running',
} satisfies PomodoroTimerState

const createStorage = (): PomodoroTimerStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('should persist state and configuration through one injected store', () => {
  const storage = createStorage()

  writePomodoroTimerState(STATE, storage)
  writePomodoroTimerConfig(CONFIG, storage)

  expect(readPomodoroTimerState(storage)).toEqual(STATE)
  expect(readPomodoroTimerConfig(storage)).toEqual(CONFIG)
})

it('should restore an expired idle state with preserved remaining progress', () => {
  const storage = createStorage()
  const state = stopPomodoroTimer(RUNNING_STATE, CONFIG, {
    now: 1_000,
    preserveRemainingProgress: true,
  })

  expect(state).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 0,
    status: 'idle',
  })

  writePomodoroTimerState(state, storage)

  expect(readPomodoroTimerState(storage)).toEqual(state)
})

it('should return defaults when the injected store fails', () => {
  const storage: PomodoroTimerStorage = {
    getItem: () => {
      throw new Error('read denied')
    },
    setItem: () => {
      throw new Error('write denied')
    },
  }

  expect(readPomodoroTimerState(storage)).toBeNull()
  expect(readPomodoroTimerConfig(storage)).toBeNull()
  expect(() => writePomodoroTimerState(STATE, storage)).not.toThrow()
  expect(() => writePomodoroTimerConfig(CONFIG, storage)).not.toThrow()
})
