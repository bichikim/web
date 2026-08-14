import type {PomodoroTimerState} from './model'

export type PomodoroTimerEvent = 'break-end' | 'break-start' | 'focus-end' | 'focus-start'

const getEndEvent = (state: PomodoroTimerState): PomodoroTimerEvent =>
  state.phase === 'focus' ? 'focus-end' : 'break-end'

const getStartEvent = (state: PomodoroTimerState): PomodoroTimerEvent =>
  state.phase === 'focus' ? 'focus-start' : 'break-start'

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
