import type {PomodoroTimerState} from './model'

export type PomodoroTimerEvent =
  | 'break-end'
  | 'break-start'
  | 'focus-end'
  | 'focus-start'
  | 'long-break-end'
  | 'long-break-start'

const getEndEvent = (state: PomodoroTimerState): PomodoroTimerEvent => {
  switch (state.phase) {
    case 'focus':
      return 'focus-end'
    case 'longBreak':
      return 'long-break-end'
    case 'shortBreak':
      return 'break-end'
  }

  const exhaustivePhase: never = state.phase
  return exhaustivePhase
}

const getStartEvent = (state: PomodoroTimerState): PomodoroTimerEvent => {
  switch (state.phase) {
    case 'focus':
      return 'focus-start'
    case 'longBreak':
      return 'long-break-start'
    case 'shortBreak':
      return 'break-start'
  }

  const exhaustivePhase: never = state.phase
  return exhaustivePhase
}

/** Returns lifecycle events caused by one observable timer state transition. */
export const getPomodoroTimerEvents = (
  previousState: PomodoroTimerState,
  nextState: PomodoroTimerState,
): ReadonlyArray<PomodoroTimerEvent> => {
  const phaseChanged = previousState.phase !== nextState.phase
  const events: Array<PomodoroTimerEvent> = []

  if (previousState.status !== 'idle' && (phaseChanged || nextState.status === 'idle')) {
    events.push(getEndEvent(previousState))
  }

  if (nextState.status === 'running' && (phaseChanged || previousState.status === 'idle')) {
    events.push(getStartEvent(nextState))
  }

  return events
}
