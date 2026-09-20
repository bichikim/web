import {usePreference} from 'src/hooks/use-preference'
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {z} from 'zod'

import {readAutoStartPreference, writeAutoStartPreference} from './auto-start-storage'
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
import {
  pomodoroTimerConfigSchema,
  pomodoroTimerStateSchema,
  type PomodoroTimerStorage,
  readPomodoroTimerConfig,
  readPomodoroTimerState,
  writePomodoroTimerConfig,
  writePomodoroTimerState,
} from './storage'

const autoStartStorage = {
  read: readAutoStartPreference,
  write: (_key: string, value: unknown) =>
    typeof value === 'boolean' ? writeAutoStartPreference(value) : null,
}

const TIMER_SYNC_CHANNEL = 'pomo:pomodoro-timer:v1'
const timerSyncMessageSchema = z.object({
  config: pomodoroTimerConfigSchema,
  isAutoStartEnabled: z.boolean(),
  state: pomodoroTimerStateSchema,
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
  readonly storage?: PomodoroTimerStorage
  readonly stopOnUnmount?: boolean
  readonly onEvents?: (
    events: ReadonlyArray<PomodoroTimerEvent>,
    options?: PomodoroTimerEventDeliveryOptions,
  ) => void
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Timer restoration, catch-up events, cross-window synchronization, and persistence share one lifecycle.
export const usePomodoroTimer = (props: UsePomodoroTimerProps = {}): PomodoroTimerController => {
  let resolveInitialization!: () => void
  let stateToRestore: PomodoroTimerState | null = null
  const initialization = new Promise<void>((resolve) => {
    resolveInitialization = resolve
  })
  let syncController: TimerSyncController | null = null
  const [config, setConfig] = createSignal<PomodoroTimerConfig>(POMODORO_TIMER_CONFIG)
  const [autoStart, setIsAutoStartEnabled] = usePreference({
    defaultValue: false,
    key: 'pomo:timer-auto-start:v2',
    parse: (value) => (typeof value === 'boolean' ? value : null),
    storage: autoStartStorage,
  })
  const isAutoStartEnabled = () => autoStart() ?? false
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

    if (nextState !== previousState && options.shouldPublish !== false) {
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
    const storedConfig = readPomodoroTimerConfig(props.storage) ?? POMODORO_TIMER_CONFIG
    const storedState =
      readPomodoroTimerState(props.storage) ?? createPomodoroTimerState(storedConfig)

    setConfig(storedConfig)
    setNow(currentTime)
    setState(storedState)

    syncController = createTimerSyncController((message) => {
      const result = timerSyncMessageSchema.safeParse(message)

      if (!result.success) {
        return
      }

      const shouldDeferEvents = !isStorageReady()
      if (shouldDeferEvents) {
        stateToRestore = result.data.state
      }

      const currentTime = Date.now()
      const synchronizedState = synchronizePomodoroTimer(
        result.data.state,
        currentTime,
        result.data.config,
        {autoStartNextPhase: result.data.isAutoStartEnabled},
      )

      batch(() => {
        setConfig(result.data.config)
        setIsAutoStartEnabled(result.data.isAutoStartEnabled)
        setNow(currentTime)
        applyState(synchronizedState, {
          deferEvents: shouldDeferEvents,
          isCatchUp: true,
          shouldPublish: false,
        })
      })
    })

    createEffect(() => {
      if (autoStart() === null || isStorageReady()) {
        return
      }
      untrack(() =>
        initializePomodoroTimer({
          applyState,
          getAutoStartEnabled: isAutoStartEnabled,
          getConfig: config,
          getState: state,
          getStateToRestore: () => stateToRestore,
          isDisposed: () => isDisposed,
          setNow,
          setStorageReady: markStorageReady,
          storedState,
        }),
      )
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
        const synchronizedState = synchronizePomodoroTimer(state(), currentTime, currentConfig, {
          autoStartNextPhase: isAutoStartEnabled(),
        })
        writePomodoroTimerState(
          stopPomodoroTimer(synchronizedState, currentConfig, {
            now: currentTime,
            preserveRemainingProgress: true,
          }),
          props.storage,
        )
      }
    })
  })

  createEffect(() => {
    if (!isStorageReady()) {
      return
    }

    writePomodoroTimerState(state(), props.storage)
    writePomodoroTimerConfig(config(), props.storage)
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
    applyState(stopPomodoroTimer(synchronizedState, nextConfig, {now: currentTime}))
  }
  const onAutoStartChange = (isEnabled: boolean) => {
    setIsAutoStartEnabled(isEnabled)
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
    applyState(createPomodoroTimerState(config()), {deferEvents: true})
  }
  const onStop = () => {
    cancelStateRestore()
    const currentTime = Date.now()
    const currentConfig = config()
    const autoStartNextPhase = isAutoStartEnabled()
    setNow(currentTime)
    const synchronizedState = synchronizePomodoroTimer(state(), currentTime, currentConfig, {
      autoStartNextPhase,
    })
    applyState(stopPomodoroTimer(synchronizedState, currentConfig, {now: currentTime}))
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
