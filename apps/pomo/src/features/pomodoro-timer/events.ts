import {
  advancePomodoroTimer,
  getPomodoroPhaseDuration,
  POMODORO_TIMER_CONFIG,
  type PomodoroTimerConfig,
  type PomodoroTimerState,
} from './model'

export type PomodoroTimerEvent =
  | 'break-end'
  | 'break-start'
  | 'focus-end'
  | 'focus-start'
  | 'long-break-end'
  | 'long-break-start'

// oxlint-disable-next-line eslint/no-magic-numbers -- Bound for delayed timer event delivery.
export const MAX_POMODORO_TIMER_CATCH_UP_EVENTS = 16 as const

export interface PomodoroTimerEventDeliveryOptions {
  readonly isCatchUp: true
}

/** Limits the number of lifecycle events returned for delayed delivery. */
export interface GetPomodoroTimerEventsOptions {
  readonly maxEventCount?: number
}

interface AppendTransitionEventsOptions {
  readonly maxEventCount?: number
  readonly shouldEmitStartEvent: boolean
}

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

const hasPendingTransitions = (currentState: PomodoroTimerState, nextState: PomodoroTimerState) =>
  currentState.completedFocusSessions < nextState.completedFocusSessions ||
  currentState.phase !== nextState.phase

const getTransitionPairCountFromCycleBoundary = (
  currentState: PomodoroTimerState,
  nextState: PomodoroTimerState,
  config: PomodoroTimerConfig,
): number | null => {
  const completedFocusSessions =
    nextState.completedFocusSessions - currentState.completedFocusSessions
  const sessionsPerCycle = config.focusSessionsPerCycle

  if (completedFocusSessions < 0) {
    return null
  }

  const completedCycles = Math.floor(completedFocusSessions / sessionsPerCycle)
  const remainingSessions = completedFocusSessions % sessionsPerCycle
  const transitionPairsPerCycle = sessionsPerCycle * 2

  switch (nextState.phase) {
    case 'focus':
      return completedCycles * transitionPairsPerCycle + remainingSessions * 2
    case 'longBreak':
      return completedFocusSessions > 0 && remainingSessions === 0
        ? completedCycles * transitionPairsPerCycle - 1
        : null
    case 'shortBreak':
      return remainingSessions > 0
        ? completedCycles * transitionPairsPerCycle + remainingSessions * 2 - 1
        : null
  }

  const exhaustivePhase: never = nextState.phase
  return exhaustivePhase
}

const skipEarlierCycles = (
  currentState: PomodoroTimerState,
  nextState: PomodoroTimerState,
  config: PomodoroTimerConfig,
  maxEventCount: number,
): PomodoroTimerState => {
  const sessionsPerCycle = config.focusSessionsPerCycle
  const isCycleBoundary =
    currentState.phase === 'focus' && currentState.completedFocusSessions % sessionsPerCycle === 0

  if (!isCycleBoundary) {
    return currentState
  }

  const transitionPairCount = getTransitionPairCountFromCycleBoundary(
    currentState,
    nextState,
    config,
  )

  if (transitionPairCount === null) {
    return currentState
  }

  const transitionPairsPerCycle = sessionsPerCycle * 2
  const maxTransitionPairCount = Math.floor(maxEventCount / 2)
  const completedFocusSessions =
    nextState.completedFocusSessions - currentState.completedFocusSessions
  const completedCycles = Math.floor(completedFocusSessions / sessionsPerCycle)
  const maximumSkippableCycles =
    nextState.phase === 'longBreak' ? Math.max(0, completedCycles - 1) : completedCycles
  const cyclesToSkip = Math.min(
    maximumSkippableCycles,
    Math.max(
      0,
      Math.floor((transitionPairCount - maxTransitionPairCount) / transitionPairsPerCycle),
    ),
  )

  if (cyclesToSkip === 0) {
    return currentState
  }

  return {
    ...currentState,
    completedFocusSessions: currentState.completedFocusSessions + cyclesToSkip * sessionsPerCycle,
  }
}

const appendTransitionEvents = (
  events: Array<PomodoroTimerEvent>,
  currentState: PomodoroTimerState,
  nextState: PomodoroTimerState,
  options: AppendTransitionEventsOptions,
) => {
  events.push(getEndEvent(currentState))

  if (options.shouldEmitStartEvent) {
    events.push(getStartEvent(nextState))
  }

  if (options.maxEventCount !== undefined && events.length > options.maxEventCount) {
    events.splice(0, events.length - options.maxEventCount)
  }
}

const shouldEmitTransitionStartEvent = (
  transitionedState: PomodoroTimerState,
  nextState: PomodoroTimerState,
  config: PomodoroTimerConfig,
) =>
  nextState.status === 'running' ||
  hasPendingTransitions(transitionedState, nextState) ||
  (nextState.status === 'paused' &&
    nextState.remainingSeconds < getPomodoroPhaseDuration(nextState.phase, config))

/** Returns lifecycle events caused by one observable timer state transition. */
export const getPomodoroTimerEvents = (
  previousState: PomodoroTimerState,
  nextState: PomodoroTimerState,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
  options: GetPomodoroTimerEventsOptions = {},
): ReadonlyArray<PomodoroTimerEvent> => {
  const phaseChanged = previousState.phase !== nextState.phase
  const events: Array<PomodoroTimerEvent> = []

  if (
    previousState.status === 'running' &&
    nextState.status !== 'idle' &&
    (nextState.completedFocusSessions > previousState.completedFocusSessions ||
      (phaseChanged && nextState.status === 'paused'))
  ) {
    let currentState: PomodoroTimerState = previousState

    while (hasPendingTransitions(currentState, nextState)) {
      if (options.maxEventCount !== undefined) {
        currentState = skipEarlierCycles(currentState, nextState, config, options.maxEventCount)

        if (!hasPendingTransitions(currentState, nextState)) {
          break
        }
      }

      const nextPhaseState = advancePomodoroTimer(currentState, config)
      appendTransitionEvents(events, currentState, nextPhaseState, {
        maxEventCount: options.maxEventCount,
        shouldEmitStartEvent: shouldEmitTransitionStartEvent(nextPhaseState, nextState, config),
      })
      currentState = nextPhaseState
    }

    return events
  }

  if (previousState.status !== 'idle' && (phaseChanged || nextState.status === 'idle')) {
    events.push(getEndEvent(previousState))
  }

  if (nextState.status === 'running' && (phaseChanged || previousState.status === 'idle')) {
    events.push(getStartEvent(nextState))
  }

  return events
}
