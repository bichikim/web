/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {getPomodoroTimerEvents} from '../events'
import {type PomodoroTimerState, synchronizePomodoroTimer} from '../model'

const createState = (
  phase: PomodoroTimerState['phase'],
  status: PomodoroTimerState['status'],
): PomodoroTimerState => {
  if (status === 'running') {
    return {completedFocusSessions: 0, endsAt: 1_000, phase, status}
  }

  return {completedFocusSessions: 0, phase, remainingSeconds: 1, status}
}

describe('getPomodoroTimerEvents', () => {
  it('should emit the matching start event only when a phase begins', () => {
    expect(
      getPomodoroTimerEvents(createState('focus', 'idle'), createState('focus', 'running')),
    ).toEqual(['focus-start'])
    expect(
      getPomodoroTimerEvents(
        createState('shortBreak', 'idle'),
        createState('shortBreak', 'running'),
      ),
    ).toEqual(['break-start'])
    expect(
      getPomodoroTimerEvents(createState('longBreak', 'idle'), createState('longBreak', 'running')),
    ).toEqual(['long-break-start'])
    expect(
      getPomodoroTimerEvents(createState('focus', 'paused'), createState('focus', 'running')),
    ).toEqual([])
  })

  it('should emit the matching end event when an active phase ends', () => {
    expect(
      getPomodoroTimerEvents(createState('focus', 'running'), createState('focus', 'idle')),
    ).toEqual(['focus-end'])
    expect(
      getPomodoroTimerEvents(
        createState('shortBreak', 'paused'),
        createState('shortBreak', 'idle'),
      ),
    ).toEqual(['break-end'])
    expect(
      getPomodoroTimerEvents(createState('longBreak', 'paused'), createState('longBreak', 'idle')),
    ).toEqual(['long-break-end'])
    expect(
      getPomodoroTimerEvents(createState('focus', 'running'), createState('focus', 'paused')),
    ).toEqual([])
  })

  it('should order the ending event before the automatically started phase event', () => {
    expect(
      getPomodoroTimerEvents(createState('focus', 'running'), createState('shortBreak', 'running')),
    ).toEqual(['focus-end', 'break-start'])
    expect(
      getPomodoroTimerEvents(createState('longBreak', 'running'), createState('focus', 'running')),
    ).toEqual(['long-break-end', 'focus-start'])
    expect(
      getPomodoroTimerEvents(createState('focus', 'running'), createState('longBreak', 'running')),
    ).toEqual(['focus-end', 'long-break-start'])
  })

  it('should preserve an unexpected phase at exhaustive runtime fallbacks', () => {
    const invalidIdle = createState('unexpected' as PomodoroTimerState['phase'], 'idle')
    const invalidRunning = createState('unexpected' as PomodoroTimerState['phase'], 'running')

    expect(getPomodoroTimerEvents(invalidRunning, invalidIdle)).toEqual(['unexpected'])
    expect(getPomodoroTimerEvents(invalidIdle, invalidRunning)).toEqual(['unexpected'])
  })
})

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
}

it.each([
  {events: ['focus-end', 'break-start', 'break-end', 'focus-start'], now: 15_000},
  {
    events: [
      'focus-end',
      'break-start',
      'break-end',
      'focus-start',
      'focus-end',
      'long-break-start',
    ],
    now: 25_000,
  },
  {
    events: [
      'focus-end',
      'break-start',
      'break-end',
      'focus-start',
      'focus-end',
      'long-break-start',
      'long-break-end',
      'focus-start',
      'focus-end',
      'break-start',
      'break-end',
      'focus-start',
    ],
    now: 45_000,
  },
])('should retain ordered transitions across cycle boundaries at $now', ({now, events}) => {
  const previous = {...createState('focus', 'running'), endsAt: 10_000}
  const next = synchronizePomodoroTimer(previous, now, CONFIG, {autoStartNextPhase: true})
  expect(getPomodoroTimerEvents(previous, next, CONFIG)).toEqual(events)
})

it('should retain transitions when both endpoints are short breaks', () => {
  const previous = {
    ...createState('shortBreak', 'running'),
    completedFocusSessions: 1,
    endsAt: 4_000,
  }
  const next = synchronizePomodoroTimer(previous, 31_000, CONFIG, {autoStartNextPhase: true})
  expect(getPomodoroTimerEvents(previous, next, CONFIG)).toEqual([
    'break-end',
    'focus-start',
    'focus-end',
    'long-break-start',
    'long-break-end',
    'focus-start',
    'focus-end',
    'break-start',
  ])
})

it('should emit only the active phase end when resetting completed sessions', () => {
  const previous = {...createState('focus', 'running'), completedFocusSessions: 3}
  expect(getPomodoroTimerEvents(previous, createState('focus', 'idle'), CONFIG)).toEqual([
    'focus-end',
  ])
})
