/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  createPomodoroTimerState,
  startPomodoroTimer,
  stopPomodoroTimer,
  type PomodoroTimerConfig,
} from '../features/pomodoro-timer/model'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

describe('stopPomodoroTimer preserveRemainingProgress after phase deadline', () => {
  it('should keep the expired focus phase progress instead of advancing to the next phase', () => {
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
})
