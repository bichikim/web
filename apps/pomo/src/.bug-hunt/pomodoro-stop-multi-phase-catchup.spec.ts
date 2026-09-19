/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {
  createPomodoroTimerState,
  startPomodoroTimer,
  stopPomodoroTimer,
  synchronizePomodoroTimer,
  type PomodoroTimerConfig,
} from '../features/pomodoro-timer'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

describe('pomodoro stop after multi-phase expiry', () => {
  it('should catch up through every expired phase before stopping when auto-start is enabled', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)
    const now = 15_000

    expect(
      synchronizePomodoroTimer(runningState, now, CONFIG, {autoStartNextPhase: true}),
    ).toMatchObject({
      completedFocusSessions: 1,
      phase: 'focus',
      status: 'running',
    })

    expect(stopPomodoroTimer(runningState, CONFIG, {now})).toMatchObject({
      completedFocusSessions: 1,
      phase: 'focus',
      status: 'idle',
    })
  })
})
