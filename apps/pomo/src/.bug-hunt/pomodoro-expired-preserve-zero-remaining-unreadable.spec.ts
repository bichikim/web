/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  createPomodoroTimerState,
  type PomodoroTimerConfig,
  startPomodoroTimer,
  stopPomodoroTimer,
} from '../features/pomodoro-timer/model'
import {readPomodoroTimerState, writePomodoroTimerState} from '../features/pomodoro-timer/storage'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

describe('pomodoro expired preserve persistence', () => {
  it('should reload idle state after preserving zero remaining seconds from an expired running phase', () => {
    const storage = {
      getItem(key: string) {
        return this.values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        this.values.set(key, value)
      },
      values: new Map<string, string>(),
    }
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)
    const preserved = stopPomodoroTimer(runningState, CONFIG, {
      now: 12_000,
      preserveRemainingProgress: true,
    })

    expect(preserved).toMatchObject({remainingSeconds: 0, status: 'idle'})

    writePomodoroTimerState(preserved, storage)

    expect(readPomodoroTimerState(storage)).toEqual(preserved)
  })
})
