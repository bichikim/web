/** @vitest-environment node */

import {expect, it} from 'vitest'

import {type PomodoroTimerConfig} from '../features/pomodoro-timer/model'
import {readPomodoroTimerConfig, writePomodoroTimerConfig} from '../features/pomodoro-timer/storage'

const CONFIG = {
  focusSeconds: 25 * 60,
  focusSessionsPerCycle: 4,
  longBreakSeconds: 15 * 60,
  shortBreakSeconds: 5 * 60,
} satisfies PomodoroTimerConfig

it('should restore timer config when numeric fields are JSON strings', () => {
  const storage = {
    values: new Map<string, string>(),
    getItem(key: string) {
      return this.values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      this.values.set(key, value)
    },
  }

  writePomodoroTimerConfig(CONFIG, storage)
  storage.setItem(
    'pomo:timer-config:v1',
    JSON.stringify({
      focusSeconds: '1500',
      focusSessionsPerCycle: '4',
      longBreakSeconds: '900',
      shortBreakSeconds: '300',
    }),
  )

  expect(readPomodoroTimerConfig(storage)).toEqual(CONFIG)
})
