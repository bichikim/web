/** @vitest-environment node */

import {expect, it} from 'vitest'

import {type PomodoroTimerState} from '../features/pomodoro-timer/model'
import {
  POMODORO_TIMER_STORAGE_KEY,
  readPomodoroTimerState,
  writePomodoroTimerState,
} from '../features/pomodoro-timer/storage'

const STATE = {
  completedFocusSessions: 1,
  phase: 'focus',
  remainingSeconds: 900,
  status: 'paused',
} satisfies PomodoroTimerState

it('should restore paused timer state when numeric fields are JSON strings', () => {
  const storage = {
    values: new Map<string, string>(),
    getItem(key: string) {
      return this.values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      this.values.set(key, value)
    },
  }

  writePomodoroTimerState(STATE, storage)
  storage.setItem(
    POMODORO_TIMER_STORAGE_KEY,
    JSON.stringify({
      completedFocusSessions: '1',
      phase: 'focus',
      remainingSeconds: '900',
      status: 'paused',
    }),
  )

  expect(readPomodoroTimerState(storage)).toEqual(STATE)
})
