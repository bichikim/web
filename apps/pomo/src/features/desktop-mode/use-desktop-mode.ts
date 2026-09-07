import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {
  type DesktopMode,
  isDesktopMode,
  readCleanExit,
  readDesktopMode,
  writeCleanExit,
  writeDesktopMode,
} from './model'
import {
  applyDesktopMode,
  finishDesktopModeTransition,
  prepareDesktopModeTransition,
} from './runtime'
import {getDesktopErrorMessage} from './error'

const MODE_CHANNEL = 'pomo:desktop-mode'
const MODE_EVENT = 'desktop-mode-requested'
const handleBeforeUnload = () => writeCleanExit(true)

interface ModeRequestMessage {
  readonly mode: DesktopMode
  readonly requestId: string
  readonly type: 'mode-requested'
}

interface ModeCompletedMessage {
  readonly requestId: string
  readonly type: 'mode-change-completed'
}

interface ModeFailedMessage {
  readonly message: string
  readonly requestId: string
  readonly type: 'mode-change-failed'
}

interface PendingModeRequest {
  readonly reject: (error: Error) => void
  readonly requestId: string
  readonly resolve: () => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isModeRequestMessage = (value: unknown): value is ModeRequestMessage =>
  isRecord(value) &&
  value.type === 'mode-requested' &&
  typeof value.requestId === 'string' &&
  isDesktopMode(value.mode)

const isModeCompletedMessage = (value: unknown): value is ModeCompletedMessage =>
  isRecord(value) && value.type === 'mode-change-completed' && typeof value.requestId === 'string'

const isModeFailedMessage = (value: unknown): value is ModeFailedMessage =>
  isRecord(value) &&
  value.type === 'mode-change-failed' &&
  typeof value.requestId === 'string' &&
  typeof value.message === 'string'

const createModeQueue = (changeMode: (mode: DesktopMode) => Promise<void>) => {
  let transitionQueue = Promise.resolve()

  return (nextMode: DesktopMode): Promise<void> => {
    const transition = transitionQueue.then(() => changeMode(nextMode))
    transitionQueue = transition.catch(() => undefined)
    return transition
  }
}

const listenToNativeModeRequests = async (
  onModeRequested: (mode: DesktopMode) => void,
): Promise<() => void> => {
  const {listen} = await import('@tauri-apps/api/event')
  return listen<string>(MODE_EVENT, (event) => {
    if (isDesktopMode(event.payload)) {
      onModeRequested(event.payload)
    }
  })
}

export interface DesktopModeController {
  readonly error: Accessor<string | null>
  readonly isChanging: Accessor<boolean>
  readonly mode: Accessor<DesktopMode>
  readonly onModeChange: (mode: DesktopMode) => Promise<void>
}

export interface UseDesktopModeProps {
  readonly isSurfaceOwner?: boolean
}

/** Owns desktop mode persistence, native transitions, and cross-window convergence. */
export const useDesktopMode = (props: UseDesktopModeProps = {}): DesktopModeController => {
  const [mode, setMode] = createSignal<DesktopMode>('normal')
  const [isChanging, setIsChanging] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let channel: BroadcastChannel | null = null
  let pendingRequest: PendingModeRequest | null = null
  let removeModeListener: (() => void) | null = null
  let isDisposed = false
  const surfaceOwner = props.isSurfaceOwner ?? false

  const publishMode = (nextMode: DesktopMode) => {
    writeDesktopMode(nextMode)
    setMode(nextMode)
    channel?.postMessage(nextMode)
  }

  const restoreMode = async (previousMode: DesktopMode) => {
    await applyDesktopMode(previousMode)
    await prepareDesktopModeTransition(previousMode)
    await finishDesktopModeTransition(previousMode)
    if (mode() !== previousMode) {
      publishMode(previousMode)
    }
  }

  const applyModeChange = async (nextMode: DesktopMode) => {
    if (nextMode === mode()) {
      return
    }

    setIsChanging(true)
    setError(null)
    const previousMode = mode()
    try {
      await applyDesktopMode(nextMode)
      await prepareDesktopModeTransition(nextMode)
      publishMode(nextMode)
      await finishDesktopModeTransition(nextMode)
    } catch (transitionError: unknown) {
      let reportedError = transitionError

      try {
        await restoreMode(previousMode)
      } catch (rollbackError: unknown) {
        reportedError = new AggregateError(
          [transitionError, rollbackError],
          'Desktop mode transition and rollback failed',
        )
      }

      setError(getDesktopErrorMessage(reportedError))
      throw reportedError
    } finally {
      setIsChanging(false)
    }
  }

  const queueModeChange = createModeQueue(applyModeChange)
  const requestMode = (nextMode: DesktopMode) => queueModeChange(nextMode).catch(() => undefined)

  const requestOwnerMode = (nextMode: DesktopMode): Promise<void> => {
    if (isChanging() || nextMode === mode()) {
      return Promise.resolve()
    }

    const activeChannel = channel
    /* v8 ignore next -- onMount initializes the channel before consumers can call the controller. */
    if (activeChannel === null) {
      return Promise.reject(new Error('Desktop mode owner channel is not available'))
    }

    setIsChanging(true)
    setError(null)
    const requestId = crypto.randomUUID()
    return new Promise<void>((resolve, reject) => {
      pendingRequest = {reject, requestId, resolve}
      activeChannel.postMessage({mode: nextMode, requestId, type: 'mode-requested'})
    }).finally(() => setIsChanging(false))
  }

  const onModeChange = (nextMode: DesktopMode): Promise<void> => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return Promise.resolve()
    }

    return surfaceOwner ? queueModeChange(nextMode) : requestOwnerMode(nextMode)
  }

  onMount(() => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return
    }

    channel = new BroadcastChannel(MODE_CHANNEL)
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (isDesktopMode(event.data)) {
        setError(null)
        setMode(event.data)
        return
      }

      if (surfaceOwner && isModeRequestMessage(event.data)) {
        const request = event.data
        queueModeChange(request.mode)
          .then(() =>
            channel?.postMessage({requestId: request.requestId, type: 'mode-change-completed'}),
          )
          .catch((requestError: unknown) =>
            channel?.postMessage({
              message: getDesktopErrorMessage(requestError),
              requestId: request.requestId,
              type: 'mode-change-failed',
            }),
          )
        return
      }

      const activeRequest = pendingRequest
      if (activeRequest === null) {
        return
      }

      if (isModeCompletedMessage(event.data) && event.data.requestId === activeRequest.requestId) {
        pendingRequest = null
        activeRequest.resolve()
      } else if (
        isModeFailedMessage(event.data) &&
        event.data.requestId === activeRequest.requestId
      ) {
        pendingRequest = null
        const requestError = new Error(event.data.message)
        setError(requestError.message)
        activeRequest.reject(requestError)
      }
    })

    if (surfaceOwner) {
      const storedMode = readCleanExit() ? readDesktopMode() : 'normal'
      writeCleanExit(false)
      requestMode(storedMode)
      window.addEventListener('beforeunload', handleBeforeUnload)
      listenToNativeModeRequests(requestMode)
        .then((unlisten) => {
          if (isDisposed) {
            unlisten()
          } else {
            removeModeListener = unlisten
          }
        })
        .catch((listenError: unknown) => {
          if (!isDisposed) {
            setError(getDesktopErrorMessage(listenError))
          }
        })
      onCleanup(() => window.removeEventListener('beforeunload', handleBeforeUnload))
    } else {
      setMode(readDesktopMode())
    }

    onCleanup(() => {
      isDisposed = true
      pendingRequest?.reject(new Error('Desktop mode controller was disposed'))
      pendingRequest = null
      removeModeListener?.()
      channel?.close()
      channel = null
    })
  })

  return {error, isChanging, mode, onModeChange}
}
