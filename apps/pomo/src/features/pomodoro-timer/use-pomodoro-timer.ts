import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {z} from 'zod'

import {readAutoStartPreference, writeAutoStartPreference} from './auto-start-storage'
import {getPomodoroTimerEvents, type PomodoroTimerEvent} from './events'
import {
  advancePomodoroTimer,
  createPomodoroTimerState,
  getPomodoroProgress,
  getPomodoroRemainingSeconds,
  pausePomodoroTimer,
  POMODORO_TIMER_CONFIG,
  type PomodoroTimerConfig,
  type PomodoroTimerState,
  resetPomodoroTimer,
  startPomodoroTimer,
  stopPomodoroTimer,
  synchronizePomodoroTimer,
} from './model'

const STORAGE_KEY = 'pomo:timer:v1'
const CONFIG_STORAGE_KEY = 'pomo:timer-config:v1'
const MAX_DURATION_MINUTES = 120
const MAX_FOCUS_SESSIONS = 12
const SECONDS_PER_MINUTE = 60
const MAX_DURATION_SECONDS = MAX_DURATION_MINUTES * SECONDS_PER_MINUTE
const TIMER_REFRESH_INTERVAL = 250
const phaseSchema = z.union([z.literal('focus'), z.literal('longBreak'), z.literal('shortBreak')])
const stateBaseSchema = {
  completedFocusSessions: z.number().int().nonnegative(),
  phase: phaseSchema,
}
const timerStateSchema = z.discriminatedUnion('status', [
  z.object({
    ...stateBaseSchema,
    remainingSeconds: z.number().int().positive(),
    status: z.literal('idle'),
  }),
  z.object({
    ...stateBaseSchema,
    remainingSeconds: z.number().int().positive(),
    status: z.literal('paused'),
  }),
  z.object({
    ...stateBaseSchema,
    endsAt: z.number().positive(),
    status: z.literal('running'),
  }),
])
const timerConfigSchema = z.object({
  focusSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
  focusSessionsPerCycle: z.number().int().positive().max(MAX_FOCUS_SESSIONS),
  longBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
  shortBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
})

export interface PomodoroTimerController {
  readonly config: Accessor<PomodoroTimerConfig>
  readonly isAutoStartEnabled: Accessor<boolean>
  readonly onAutoStartChange: (isEnabled: boolean) => void
  readonly onConfigChange: (config: PomodoroTimerConfig) => void
  readonly onNextPhase: () => void
  readonly onPause: () => void
  readonly onReset: () => void
  readonly onStart: () => void
  readonly onStop: () => void
  readonly progress: Accessor<number>
  readonly remainingSeconds: Accessor<number>
  readonly state: Accessor<PomodoroTimerState>
}

export interface UsePomodoroTimerProps {
  readonly onEvents?: (events: ReadonlyArray<PomodoroTimerEvent>) => void
}

const readStoredState = (): PomodoroTimerState | null => {
  try {
    const storedState = localStorage.getItem(STORAGE_KEY)

    if (storedState === null) {
      return null
    }

    const result = timerStateSchema.safeParse(JSON.parse(storedState) as unknown)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const writeStoredState = (state: PomodoroTimerState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage is an enhancement; timer operation must continue when it is unavailable.
  }
}

const readStoredConfig = (): PomodoroTimerConfig | null => {
  try {
    const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY)

    if (storedConfig === null) {
      return null
    }

    const result = timerConfigSchema.safeParse(JSON.parse(storedConfig) as unknown)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const writeStoredConfig = (config: PomodoroTimerConfig) => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Storage is an enhancement; timer operation must continue when it is unavailable.
  }
}

export const usePomodoroTimer = (props: UsePomodoroTimerProps = {}): PomodoroTimerController => {
  let autoStartRevision = 0
  const [config, setConfig] = createSignal<PomodoroTimerConfig>(POMODORO_TIMER_CONFIG)
  const [isAutoStartEnabled, setIsAutoStartEnabled] = createSignal(false)
  const [state, setState] = createSignal<PomodoroTimerState>(
    createPomodoroTimerState(POMODORO_TIMER_CONFIG),
  )
  const [now, setNow] = createSignal(0)
  const [isStorageReady, setIsStorageReady] = createSignal(false)

  const applyState = (nextState: PomodoroTimerState) => {
    const previousState = state()
    setState(nextState)
    const events = getPomodoroTimerEvents(previousState, nextState)

    if (events.length > 0) {
      props.onEvents?.(events)
    }
  }

  const refresh = () => {
    if (!isStorageReady()) {
      return
    }

    const currentState = state()

    if (currentState.status !== 'running') {
      return
    }

    const currentTime = Date.now()
    setNow(currentTime)
    applyState(
      synchronizePomodoroTimer(currentState, currentTime, config(), {
        autoStartNextPhase: isAutoStartEnabled(),
      }),
    )
  }

  onMount(() => {
    let isDisposed = false
    const currentTime = Date.now()
    const storedConfig = readStoredConfig() ?? POMODORO_TIMER_CONFIG
    const storedState = readStoredState() ?? createPomodoroTimerState(storedConfig)
    const wasRunningAtMount = storedState.status === 'running' && storedState.endsAt > currentTime

    setConfig(storedConfig)
    setNow(currentTime)
    setState(storedState)

    const initializeAutoStart = async () => {
      const initialRevision = autoStartRevision
      const storedAutoStart = await readAutoStartPreference()

      if (isDisposed) {
        return
      }

      if (autoStartRevision === initialRevision) {
        setIsAutoStartEnabled(storedAutoStart)
      }

      const autoStartNextPhase = isAutoStartEnabled()
      const restoredAt = Date.now()
      setNow(restoredAt)
      const currentState = state()

      if (currentState === storedState) {
        const synchronizedState = synchronizePomodoroTimer(storedState, restoredAt, storedConfig, {
          autoStartNextPhase,
        })

        if (wasRunningAtMount) {
          applyState(synchronizedState)
        } else {
          setState(synchronizedState)
        }
      }

      setIsStorageReady(true)
    }

    initializeAutoStart()

    const refreshTimer = window.setInterval(refresh, TIMER_REFRESH_INTERVAL)
    document.addEventListener('visibilitychange', refresh)

    onCleanup(() => {
      isDisposed = true
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', refresh)
    })
  })

  createEffect(() => {
    if (!isStorageReady()) {
      return
    }

    writeStoredState(state())
    writeStoredConfig(config())
  })

  const onStart = () => {
    const currentTime = Date.now()
    setNow(currentTime)
    applyState(startPomodoroTimer(state(), currentTime))
  }
  const onPause = () => {
    const currentTime = Date.now()
    setNow(currentTime)
    applyState(
      pausePomodoroTimer(state(), currentTime, config(), {
        autoStartNextPhase: isAutoStartEnabled(),
      }),
    )
  }
  const onConfigChange = (nextConfig: PomodoroTimerConfig) => {
    setConfig(nextConfig)
    applyState(stopPomodoroTimer(state(), nextConfig))
  }
  const onAutoStartChange = (isEnabled: boolean) => {
    autoStartRevision += 1
    setIsAutoStartEnabled(isEnabled)
    writeAutoStartPreference(isEnabled)
  }
  const onNextPhase = () => applyState(advancePomodoroTimer(state(), config()))
  const onReset = () => applyState(resetPomodoroTimer(config()))
  const onStop = () => applyState(stopPomodoroTimer(state(), config()))
  const remainingSeconds = createMemo(() => getPomodoroRemainingSeconds(state(), now()))
  const progress = createMemo(() => getPomodoroProgress(state(), now(), config()))

  return {
    config,
    isAutoStartEnabled,
    onAutoStartChange,
    onConfigChange,
    onNextPhase,
    onPause,
    onReset,
    onStart,
    onStop,
    progress,
    remainingSeconds,
    state,
  }
}
