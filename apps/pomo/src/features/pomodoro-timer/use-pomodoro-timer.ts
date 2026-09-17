import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {z} from 'zod'

import {writeAutoStartPreference} from './auto-start-storage'
import {
  getPomodoroTimerEvents,
  MAX_POMODORO_TIMER_CATCH_UP_EVENTS,
  type PomodoroTimerEvent,
  type PomodoroTimerEventDeliveryOptions,
} from './events'
import {
  initializePomodoroTimer,
  type PomodoroTimerApplyStateOptions,
} from './initialize-pomodoro-timer'
import {POMODORO_TIMER_LIMITS} from './limits'
import {
  advancePomodoroTimer,
  createPomodoroTimerState,
  getPomodoroProgress,
  getPomodoroRemainingSeconds,
  pausePomodoroTimer,
  POMODORO_TIMER_CONFIG,
  type PomodoroTimerConfig,
  type PomodoroTimerState,
  startPomodoroTimer,
  stopPomodoroTimer,
  synchronizePomodoroTimer,
} from './model'

const STORAGE_KEY = 'pomo:timer:v1'
const CONFIG_STORAGE_KEY = 'pomo:timer-config:v1'
const TIMER_SYNC_CHANNEL = 'pomo:pomodoro-timer:v1'
const SECONDS_PER_MINUTE = 60
const MAX_DURATION_SECONDS = POMODORO_TIMER_LIMITS.maxDurationMinutes * SECONDS_PER_MINUTE
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
  focusSessionsPerCycle: z.number().int().positive().max(POMODORO_TIMER_LIMITS.maxFocusSessions),
  longBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
  shortBreakSeconds: z.number().int().positive().max(MAX_DURATION_SECONDS),
})
const timerSyncMessageSchema = z.object({
  config: timerConfigSchema,
  isAutoStartEnabled: z.boolean(),
  state: timerStateSchema,
})

interface TimerSyncSnapshot {
  readonly config: PomodoroTimerConfig
  readonly isAutoStartEnabled: boolean
  readonly state: PomodoroTimerState
}

interface TimerSyncController {
  readonly close: () => void
  readonly publish: (snapshot: TimerSyncSnapshot) => void
}

const createTimerSyncController = (onMessage: (message: unknown) => void): TimerSyncController => {
  if (typeof BroadcastChannel !== 'function') {
    return {close: () => undefined, publish: () => undefined}
  }

  try {
    const channel = new BroadcastChannel(TIMER_SYNC_CHANNEL)
    channel.onmessage = (event: MessageEvent<unknown>) => onMessage(event.data)

    return {
      close: () => channel.close(),
      publish: (snapshot) => {
        try {
          channel.postMessage(snapshot)
        } catch {
          // Cross-window synchronization is an enhancement; timer operation must continue when it is unavailable.
        }
      },
    }
  } catch {
    return {close: () => undefined, publish: () => undefined}
  }
}

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
  readonly waitForInitialization: () => Promise<void>
}

export interface UsePomodoroTimerProps {
  readonly stopOnUnmount?: boolean
  readonly onEvents?: (
    events: ReadonlyArray<PomodoroTimerEvent>,
    options?: PomodoroTimerEventDeliveryOptions,
  ) => void
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

// oxlint-disable-next-line eslint/max-lines-per-function -- Timer restoration, catch-up events, cross-window synchronization, and persistence share one lifecycle.
export const usePomodoroTimer = (props: UsePomodoroTimerProps = {}): PomodoroTimerController => {
  let autoStartRevision = 0
  let resolveInitialization!: () => void
  let stateToRestore: PomodoroTimerState | null = null
  const initialization = new Promise<void>((resolve) => {
    resolveInitialization = resolve
  })
  let syncController: TimerSyncController | null = null
  const [config, setConfig] = createSignal<PomodoroTimerConfig>(POMODORO_TIMER_CONFIG)
  const [isAutoStartEnabled, setIsAutoStartEnabled] = createSignal(false)
  const [state, setState] = createSignal<PomodoroTimerState>(
    createPomodoroTimerState(POMODORO_TIMER_CONFIG),
  )
  const [now, setNow] = createSignal(0)
  const [isStorageReady, setIsStorageReady] = createSignal(false)

  const publishSnapshot = () =>
    syncController?.publish({
      config: config(),
      isAutoStartEnabled: isAutoStartEnabled(),
      state: state(),
    })

  const applyState = (
    nextState: PomodoroTimerState,
    options: PomodoroTimerApplyStateOptions = {},
  ) => {
    const previousState = state()
    setState(nextState)
    const events = options.deferEvents
      ? []
      : getPomodoroTimerEvents(
          options.eventPreviousState ?? previousState,
          nextState,
          config(),
          options.isCatchUp ? {maxEventCount: MAX_POMODORO_TIMER_CATCH_UP_EVENTS} : undefined,
        )

    if (events.length > 0) {
      if (options.isCatchUp) {
        props.onEvents?.(events, {isCatchUp: true})
      } else {
        props.onEvents?.(events)
      }
    }

    if (nextState !== previousState) {
      publishSnapshot()
    }
  }

  const markStorageReady = (isReady: boolean) => {
    setIsStorageReady(isReady)
    if (isReady) {
      resolveInitialization()
    }
  }

  const cancelStateRestore = () => {
    stateToRestore = null
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
    const nextState = synchronizePomodoroTimer(currentState, currentTime, config(), {
      autoStartNextPhase: isAutoStartEnabled(),
    })

    if (nextState !== currentState) {
      applyState(nextState, {isCatchUp: true})
    }
  }

  onMount(() => {
    let isDisposed = false
    const currentTime = Date.now()
    const storedConfig = readStoredConfig() ?? POMODORO_TIMER_CONFIG
    const storedState = readStoredState() ?? createPomodoroTimerState(storedConfig)

    setConfig(storedConfig)
    setNow(currentTime)
    setState(storedState)

    syncController = createTimerSyncController((message) => {
      const result = timerSyncMessageSchema.safeParse(message)

      if (!result.success) {
        return
      }

      if (!isStorageReady()) {
        stateToRestore = result.data.state
      }

      autoStartRevision += 1
      setConfig(result.data.config)
      setIsAutoStartEnabled(result.data.isAutoStartEnabled)
      setNow(Date.now())
      setState(result.data.state)
    })

    initializePomodoroTimer({
      applyState,
      getAutoStartEnabled: isAutoStartEnabled,
      getAutoStartRevision: () => autoStartRevision,
      getConfig: config,
      getState: state,
      getStateToRestore: () => stateToRestore,
      isDisposed: () => isDisposed,
      setAutoStartEnabled: setIsAutoStartEnabled,
      setNow,
      setStorageReady: markStorageReady,
      storedState,
    })

    const refreshFrame = () => {
      refresh()
      if (!isDisposed) {
        frame = globalThis.requestAnimationFrame(refreshFrame)
      }
    }
    let frame = globalThis.requestAnimationFrame(refreshFrame)
    useEvent(document, 'visibilitychange', refresh)

    onCleanup(() => {
      isDisposed = true
      globalThis.cancelAnimationFrame(frame)
      syncController?.close()
      syncController = null
      if (props.stopOnUnmount) {
        const currentTime = Date.now()
        const currentConfig = config()
        const synchronizedState = synchronizePomodoroTimer(state(), currentTime, currentConfig)
        writeStoredState(stopPomodoroTimer(synchronizedState, currentConfig))
      }
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
    cancelStateRestore()
    const currentTime = Date.now()
    setNow(currentTime)
    applyState(startPomodoroTimer(state(), currentTime))
  }
  const onPause = () => {
    const currentTime = Date.now()
    const currentState = state()
    const shouldDeferEvents =
      !isStorageReady() && currentState.status === 'running' && currentState.endsAt <= currentTime

    if (shouldDeferEvents) {
      stateToRestore = currentState
    }

    setNow(currentTime)
    applyState(
      pausePomodoroTimer(currentState, currentTime, config(), {
        autoStartNextPhase: isAutoStartEnabled(),
      }),
      {deferEvents: shouldDeferEvents, isCatchUp: true},
    )
  }
  const onConfigChange = (nextConfig: PomodoroTimerConfig) => {
    cancelStateRestore()
    const currentTime = Date.now()
    setNow(currentTime)
    setConfig(nextConfig)
    const synchronizedState = synchronizePomodoroTimer(state(), currentTime, nextConfig)
    applyState(stopPomodoroTimer(synchronizedState, nextConfig))
  }
  const onAutoStartChange = (isEnabled: boolean) => {
    autoStartRevision += 1
    setIsAutoStartEnabled(isEnabled)
    writeAutoStartPreference(isEnabled)
    publishSnapshot()
  }
  const onNextPhase = () => {
    cancelStateRestore()
    const currentTime = Date.now()
    const currentState = state()
    const currentConfig = config()
    const autoStartNextPhase = isAutoStartEnabled()
    const isExpired = currentState.status === 'running' && currentState.endsAt <= currentTime
    setNow(currentTime)

    const synchronizedState = synchronizePomodoroTimer(currentState, currentTime, currentConfig, {
      autoStartNextPhase,
    })
    const nextState = isExpired
      ? synchronizedState
      : advancePomodoroTimer(currentState, currentConfig)

    applyState(nextState, isExpired ? {isCatchUp: true} : undefined)
  }
  const onReset = () => {
    cancelStateRestore()
    applyState(createPomodoroTimerState(config()))
  }
  const onStop = () => {
    cancelStateRestore()
    const currentTime = Date.now()
    const currentConfig = config()
    setNow(currentTime)
    const synchronizedState = synchronizePomodoroTimer(state(), currentTime, currentConfig)
    applyState(stopPomodoroTimer(synchronizedState, currentConfig))
  }
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
    waitForInitialization: () => initialization,
  }
}
