import {describe, expect, it} from 'vitest'

import {
  advancePomodoroTimer,
  createPomodoroTimerState,
  formatPomodoroTime,
  getPomodoroPhaseDuration,
  getPomodoroProgress,
  getPomodoroRemainingSeconds,
  pausePomodoroTimer,
  type PomodoroTimerConfig,
  type PomodoroTimerState,
  resetPomodoroTimer,
  startPomodoroTimer,
  stopPomodoroTimer,
  synchronizePomodoroTimer,
} from '..'

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

describe('createPomodoroTimerState', () => {
  it('should create an idle focus session from the supplied configuration', () => {
    expect(createPomodoroTimerState(CONFIG)).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })
})

describe('resetPomodoroTimer', () => {
  it('should return the first focus session while preserving the supplied configuration', () => {
    expect(resetPomodoroTimer(CONFIG)).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })
})

describe('getPomodoroPhaseDuration', () => {
  it('should return the configured duration for every phase', () => {
    expect(getPomodoroPhaseDuration('focus', CONFIG)).toBe(10)
    expect(getPomodoroPhaseDuration('shortBreak', CONFIG)).toBe(4)
    expect(getPomodoroPhaseDuration('longBreak', CONFIG)).toBe(6)
  })
})

describe('startPomodoroTimer', () => {
  it('should calculate the deadline from the remaining duration', () => {
    expect(startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)).toEqual({
      completedFocusSessions: 0,
      endsAt: 11_000,
      phase: 'focus',
      status: 'running',
    })
  })

  it('should preserve an already running timer', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(startPomodoroTimer(runningState, 2_000)).toBe(runningState)
  })
})

describe('getPomodoroRemainingSeconds', () => {
  it('should derive running time from the deadline and clamp expired time', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(getPomodoroRemainingSeconds(runningState, 1_001)).toBe(10)
    expect(getPomodoroRemainingSeconds(runningState, 2_001)).toBe(9)
    expect(getPomodoroRemainingSeconds(runningState, 12_000)).toBe(0)
  })

  it('should return stored time for an inactive timer', () => {
    expect(getPomodoroRemainingSeconds(createPomodoroTimerState(CONFIG), 99_000)).toBe(10)
  })
})

describe('pausePomodoroTimer', () => {
  it('should capture the remaining time without counting paused time', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(pausePomodoroTimer(runningState, 4_000, CONFIG)).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 7,
      status: 'paused',
    })
  })

  it('should complete a phase instead of producing a zero-duration pause', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(pausePomodoroTimer(runningState, 11_000, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 4,
      status: 'idle',
    })
  })

  it('should pause the automatically started phase after the previous phase elapsed', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(pausePomodoroTimer(runningState, 12_000, CONFIG, {autoStartNextPhase: true})).toEqual({
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 3,
      status: 'paused',
    })
  })
})

describe('synchronizePomodoroTimer', () => {
  it('should preserve inactive and unfinished states', () => {
    const idleState = createPomodoroTimerState(CONFIG)
    const runningState = startPomodoroTimer(idleState, 1_000)

    expect(synchronizePomodoroTimer(idleState, 20_000, CONFIG)).toBe(idleState)
    expect(synchronizePomodoroTimer(runningState, 10_999, CONFIG)).toBe(runningState)
  })

  it('should follow focus with a short break before the cycle boundary', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(synchronizePomodoroTimer(runningState, 11_000, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 4,
      status: 'idle',
    })
  })

  it('should follow the final focus session in a cycle with a long break', () => {
    const state = {
      completedFocusSessions: 1,
      endsAt: 11_000,
      phase: 'focus',
      status: 'running',
    } satisfies PomodoroTimerState

    expect(synchronizePomodoroTimer(state, 11_000, CONFIG)).toEqual({
      completedFocusSessions: 2,
      phase: 'longBreak',
      remainingSeconds: 6,
      status: 'idle',
    })
  })

  it('should follow either break with a fresh focus session', () => {
    const shortBreak = {
      completedFocusSessions: 1,
      endsAt: 5_000,
      phase: 'shortBreak',
      status: 'running',
    } satisfies PomodoroTimerState
    const longBreak = {...shortBreak, phase: 'longBreak'} satisfies PomodoroTimerState

    expect(synchronizePomodoroTimer(shortBreak, 5_000, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
    expect(synchronizePomodoroTimer(longBreak, 5_000, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })

  it('should immediately start the next phase when automatic playback is enabled', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(
      synchronizePomodoroTimer(runningState, 11_000, CONFIG, {autoStartNextPhase: true}),
    ).toEqual({
      completedFocusSessions: 1,
      endsAt: 15_000,
      phase: 'shortBreak',
      status: 'running',
    })
  })

  it('should preserve the continuous timeline after multiple phases elapsed', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(
      synchronizePomodoroTimer(runningState, 16_000, CONFIG, {autoStartNextPhase: true}),
    ).toEqual({
      completedFocusSessions: 1,
      endsAt: 25_000,
      phase: 'focus',
      status: 'running',
    })
  })

  it('should skip complete cycles when restoring a timer after a long absence', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(
      synchronizePomodoroTimer(runningState, 30_012_000, CONFIG, {autoStartNextPhase: true}),
    ).toEqual({
      completedFocusSessions: 2_001,
      endsAt: 30_015_000,
      phase: 'shortBreak',
      status: 'running',
    })
  })
})

describe('advancePomodoroTimer', () => {
  it('should advance focus to the appropriate break and count the focus session', () => {
    expect(advancePomodoroTimer(createPomodoroTimerState(CONFIG), CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 4,
      status: 'idle',
    })

    const finalFocus = {
      completedFocusSessions: 1,
      phase: 'focus',
      remainingSeconds: 3,
      status: 'paused',
    } satisfies PomodoroTimerState

    expect(advancePomodoroTimer(finalFocus, CONFIG)).toEqual({
      completedFocusSessions: 2,
      phase: 'longBreak',
      remainingSeconds: 6,
      status: 'idle',
    })
  })

  it('should advance either break to a fresh focus session', () => {
    const shortBreak = {
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 2,
      status: 'paused',
    } satisfies PomodoroTimerState
    const longBreak = {...shortBreak, phase: 'longBreak'} satisfies PomodoroTimerState

    expect(advancePomodoroTimer(shortBreak, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
    expect(advancePomodoroTimer(longBreak, CONFIG)).toEqual({
      completedFocusSessions: 1,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })
})

describe('stopPomodoroTimer', () => {
  it('should reset the current phase without changing completed focus sessions', () => {
    const pausedState = {
      completedFocusSessions: 3,
      phase: 'shortBreak',
      remainingSeconds: 2,
      status: 'paused',
    } satisfies PomodoroTimerState

    expect(stopPomodoroTimer(pausedState, CONFIG)).toEqual({
      completedFocusSessions: 3,
      phase: 'shortBreak',
      remainingSeconds: 4,
      status: 'idle',
    })
  })
})

describe('getPomodoroProgress', () => {
  it('should return a clamped fraction of elapsed phase time', () => {
    const runningState = startPomodoroTimer(createPomodoroTimerState(CONFIG), 1_000)

    expect(getPomodoroProgress(runningState, 6_000, CONFIG)).toBe(0.5)
    expect(getPomodoroProgress(runningState, 20_000, CONFIG)).toBe(1)
  })
})

describe('formatPomodoroTime', () => {
  it('should format clamped whole seconds as tabular timer text', () => {
    expect(formatPomodoroTime(1_502.9)).toBe('25:02')
    expect(formatPomodoroTime(-2)).toBe('00:00')
  })
})
