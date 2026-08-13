import {describe, expect, it} from 'vitest'

import {getPomodoroTimerEvents} from '../events'
import type {PomodoroTimerState} from '../model'

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
  it('should emit start events only when a focus or break phase begins', () => {
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
      getPomodoroTimerEvents(createState('focus', 'paused'), createState('focus', 'running')),
    ).toEqual([])
  })

  it('should emit end events when an active focus or break phase ends', () => {
    expect(
      getPomodoroTimerEvents(createState('focus', 'running'), createState('focus', 'idle')),
    ).toEqual(['focus-end'])
    expect(
      getPomodoroTimerEvents(createState('longBreak', 'paused'), createState('longBreak', 'idle')),
    ).toEqual(['break-end'])
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
    ).toEqual(['break-end', 'focus-start'])
  })
})
