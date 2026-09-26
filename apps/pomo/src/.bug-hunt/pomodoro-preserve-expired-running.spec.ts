/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  createPomodoroTimerState,
  startPomodoroTimer,
  stopPomodoroTimer,
} from '../features/pomodoro-timer/model'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} as const

it('should preserve the expired focus phase when stopping with remaining progress', () => {
  const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

  expect(
    stopPomodoroTimer(runningState, CONFIG, {
      now: 12_000,
      preserveRemainingProgress: true,
    }),
  ).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 0,
    status: 'idle',
  })
})
