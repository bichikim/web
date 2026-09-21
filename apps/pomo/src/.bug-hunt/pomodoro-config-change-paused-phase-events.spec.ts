/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {getPomodoroTimerEvents} from 'src/features/pomodoro-timer/events'
import {
  type PomodoroPhase,
  type PomodoroTimerConfig,
  type PomodoroTimerState,
  stopPomodoroTimer,
} from 'src/features/pomodoro-timer/model'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

const NEXT_CONFIG = {
  ...CONFIG,
  focusSeconds: 20,
  longBreakSeconds: 9,
  shortBreakSeconds: 8,
} satisfies PomodoroTimerConfig

describe('pomodoro config change while paused', () => {
  it.each([
    {completedFocusSessions: 0, phase: 'focus' as PomodoroPhase},
    {completedFocusSessions: 1, phase: 'shortBreak' as PomodoroPhase},
    {completedFocusSessions: 2, phase: 'longBreak' as PomodoroPhase},
  ])('should not emit a phase-end event when resetting paused $phase duration', ({
    completedFocusSessions,
    phase,
  }) => {
    const previous = {
      completedFocusSessions,
      phase,
      remainingSeconds: 2,
      status: 'paused',
    } satisfies PomodoroTimerState
    const next = stopPomodoroTimer(previous, NEXT_CONFIG, {now: 0})

    expect(next).toMatchObject({phase, status: 'idle'})
    expect(getPomodoroTimerEvents(previous, next, NEXT_CONFIG)).toEqual([])
  })
})
