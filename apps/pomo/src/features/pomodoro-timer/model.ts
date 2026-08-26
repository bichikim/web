export interface PomodoroTimerConfig {
  readonly focusSeconds: number
  readonly focusSessionsPerCycle: number
  readonly longBreakSeconds: number
  readonly shortBreakSeconds: number
}

const DEFAULT_FOCUS_MINUTES = 25
const DEFAULT_LONG_BREAK_MINUTES = 15
const DEFAULT_SHORT_BREAK_MINUTES = 5
const MILLISECONDS_PER_SECOND = 1_000
const SECONDS_PER_MINUTE = 60

export const POMODORO_TIMER_CONFIG = {
  focusSeconds: DEFAULT_FOCUS_MINUTES * SECONDS_PER_MINUTE,
  focusSessionsPerCycle: 4,
  longBreakSeconds: DEFAULT_LONG_BREAK_MINUTES * SECONDS_PER_MINUTE,
  shortBreakSeconds: DEFAULT_SHORT_BREAK_MINUTES * SECONDS_PER_MINUTE,
} as const satisfies PomodoroTimerConfig

export type PomodoroPhase = 'focus' | 'longBreak' | 'shortBreak'

interface PomodoroTimerStateBase {
  readonly completedFocusSessions: number
  readonly phase: PomodoroPhase
}

export interface PomodoroIdleState extends PomodoroTimerStateBase {
  readonly remainingSeconds: number
  readonly status: 'idle'
}

export interface PomodoroPausedState extends PomodoroTimerStateBase {
  readonly remainingSeconds: number
  readonly status: 'paused'
}

export interface PomodoroRunningState extends PomodoroTimerStateBase {
  readonly endsAt: number
  readonly status: 'running'
}

export type PomodoroTimerState = PomodoroIdleState | PomodoroPausedState | PomodoroRunningState

export interface PomodoroSynchronizationOptions {
  readonly autoStartNextPhase?: boolean
}

export const getPomodoroPhaseDuration = (
  phase: PomodoroPhase,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
) => {
  switch (phase) {
    case 'focus':
      return config.focusSeconds
    case 'longBreak':
      return config.longBreakSeconds
    case 'shortBreak':
      return config.shortBreakSeconds
  }

  const exhaustivePhase: never = phase
  return exhaustivePhase
}

const createIdleState = (
  phase: PomodoroPhase,
  completedFocusSessions: number,
  config: PomodoroTimerConfig,
): PomodoroIdleState => ({
  completedFocusSessions,
  phase,
  remainingSeconds: getPomodoroPhaseDuration(phase, config),
  status: 'idle',
})

export const createPomodoroTimerState = (
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
): PomodoroTimerState => createIdleState('focus', 0, config)

export const resetPomodoroTimer = (
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
): PomodoroTimerState => createPomodoroTimerState(config)

export const getPomodoroRemainingSeconds = (state: PomodoroTimerState, now: number) => {
  if (state.status !== 'running') {
    return state.remainingSeconds
  }

  return Math.max(0, Math.ceil((state.endsAt - now) / MILLISECONDS_PER_SECOND))
}

export const advancePomodoroTimer = (
  state: PomodoroTimerState,
  config: PomodoroTimerConfig,
): PomodoroIdleState => {
  if (state.phase !== 'focus') {
    return createIdleState('focus', state.completedFocusSessions, config)
  }

  const completedFocusSessions = state.completedFocusSessions + 1
  const nextPhase =
    completedFocusSessions % config.focusSessionsPerCycle === 0 ? 'longBreak' : 'shortBreak'

  return createIdleState(nextPhase, completedFocusSessions, config)
}

const skipWholeCycles = (
  state: PomodoroRunningState,
  now: number,
  config: PomodoroTimerConfig,
): PomodoroRunningState => {
  const isCycleBoundary =
    state.phase === 'focus' && state.completedFocusSessions % config.focusSessionsPerCycle === 0

  if (!isCycleBoundary) {
    return state
  }

  const cycleSeconds =
    config.focusSessionsPerCycle * config.focusSeconds +
    (config.focusSessionsPerCycle - 1) * config.shortBreakSeconds +
    config.longBreakSeconds
  const cycleMilliseconds = cycleSeconds * MILLISECONDS_PER_SECOND
  const cycleCount = Math.floor((now - state.endsAt) / cycleMilliseconds)

  if (cycleCount <= 0) {
    return state
  }

  return {
    ...state,
    completedFocusSessions:
      state.completedFocusSessions + cycleCount * config.focusSessionsPerCycle,
    endsAt: state.endsAt + cycleCount * cycleMilliseconds,
  }
}

const createRunningState = (
  state: PomodoroIdleState | PomodoroPausedState,
  now: number,
): PomodoroRunningState => ({
  completedFocusSessions: state.completedFocusSessions,
  endsAt: now + state.remainingSeconds * MILLISECONDS_PER_SECOND,
  phase: state.phase,
  status: 'running',
})

export const synchronizePomodoroTimer = (
  state: PomodoroTimerState,
  now: number,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
  options: PomodoroSynchronizationOptions = {},
): PomodoroTimerState => {
  if (state.status !== 'running' || state.endsAt > now) {
    return state
  }

  if (!options.autoStartNextPhase) {
    return advancePomodoroTimer(state, config)
  }

  let currentState = state

  while (currentState.status === 'running' && currentState.endsAt <= now) {
    currentState = skipWholeCycles(currentState, now, config)
    const nextStartTime = currentState.endsAt
    const nextState = advancePomodoroTimer(currentState, config)
    currentState = createRunningState(nextState, nextStartTime)
  }

  return currentState
}

export const startPomodoroTimer = (state: PomodoroTimerState, now: number): PomodoroTimerState => {
  if (state.status === 'running') {
    return state
  }

  return createRunningState(state, now)
}

export const pausePomodoroTimer = (
  state: PomodoroTimerState,
  now: number,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
  options: PomodoroSynchronizationOptions = {},
): PomodoroTimerState => {
  const synchronizedState = synchronizePomodoroTimer(state, now, config, options)

  if (synchronizedState.status !== 'running') {
    return synchronizedState
  }

  return {
    completedFocusSessions: synchronizedState.completedFocusSessions,
    phase: synchronizedState.phase,
    remainingSeconds: getPomodoroRemainingSeconds(synchronizedState, now),
    status: 'paused',
  }
}

export const stopPomodoroTimer = (
  state: PomodoroTimerState,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
): PomodoroTimerState => createIdleState(state.phase, state.completedFocusSessions, config)

export const getPomodoroProgress = (
  state: PomodoroTimerState,
  now: number,
  config: PomodoroTimerConfig = POMODORO_TIMER_CONFIG,
) => {
  const duration = getPomodoroPhaseDuration(state.phase, config)
  const remaining = getPomodoroRemainingSeconds(state, now)

  return Math.min(1, Math.max(0, (duration - remaining) / duration))
}

export const formatPomodoroTime = (seconds: number) => {
  const clampedSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(clampedSeconds / SECONDS_PER_MINUTE)
  const remainder = clampedSeconds % SECONDS_PER_MINUTE

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
