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
  let latestReceivedMode: DesktopMode | null = null
  let pendingMode: DesktopMode | null = null
  let receivedModeRevision = 0
  let removeModeListener: (() => void) | null = null
  let isDisposed = false
  const surfaceOwner = props.isSurfaceOwner ?? false

  const publishMode = (nextMode: DesktopMode) => {
    writeDesktopMode(nextMode)
    setMode(nextMode)
    channel?.postMessage(nextMode)
  }

  const restoreMode = async (previousMode: DesktopMode, previousRevision: number) => {
    const rollbackRevision = receivedModeRevision
    let rollbackMode = previousMode
    if (rollbackRevision !== previousRevision && latestReceivedMode !== null) {
      rollbackMode = latestReceivedMode
    }

    await applyDesktopMode(rollbackMode)
    await prepareDesktopModeTransition(rollbackMode)
    await finishDesktopModeTransition(rollbackMode)
    if (receivedModeRevision !== rollbackRevision) {
      await restoreMode(previousMode, rollbackRevision)
      return
    }

    if (mode() !== rollbackMode) {
      publishMode(rollbackMode)
    }
  }

  const restoreNewerMode = async (
    previousMode: DesktopMode,
    previousRevision: number,
  ): Promise<boolean> => {
    if (receivedModeRevision === previousRevision) {
      return false
    }

    await restoreMode(previousMode, previousRevision)
    return true
  }

  const onModeChange = async (nextMode: DesktopMode) => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true') || isChanging() || nextMode === mode()) {
      return
    }

    setIsChanging(true)
    setError(null)
    const previousMode = mode()
    const previousRevision = receivedModeRevision
    try {
      await applyDesktopMode(nextMode)
      if (await restoreNewerMode(previousMode, previousRevision)) {
        return
      }

      await prepareDesktopModeTransition(nextMode)
      if (await restoreNewerMode(previousMode, previousRevision)) {
        return
      }

      publishMode(nextMode)
      await finishDesktopModeTransition(nextMode)
      await restoreNewerMode(previousMode, previousRevision)
    } catch (transitionError: unknown) {
      let reportedError = transitionError

      try {
        await restoreMode(previousMode, previousRevision)
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

  const requestMode = async (nextMode: DesktopMode) => {
    if (isChanging()) {
      pendingMode = nextMode
      return
    }

    try {
      await onModeChange(nextMode)
    } catch {}

    const nextPendingMode = pendingMode
    pendingMode = null
    if (nextPendingMode !== null && nextPendingMode !== mode()) {
      await requestMode(nextPendingMode)
    }
  }

  onMount(() => {
    if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
      return
    }

    channel = new BroadcastChannel(MODE_CHANNEL)
    channel.addEventListener('message', (event) => {
      if (isDesktopMode(event.data)) {
        latestReceivedMode = event.data
        receivedModeRevision += 1
        setError(null)
        setMode(event.data)
      }
    })

    if (surfaceOwner) {
      const storedMode = readCleanExit() ? readDesktopMode() : 'normal'
      writeCleanExit(false)
      requestMode(storedMode)
      window.addEventListener('beforeunload', handleBeforeUnload)
      import('@tauri-apps/api/event')
        .then(({listen}) =>
          listen<string>(MODE_EVENT, (event) => {
            if (isDesktopMode(event.payload)) {
              requestMode(event.payload)
            }
          }),
        )
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
      removeModeListener?.()
      channel?.close()
      channel = null
    })
  })

  return {error, isChanging, mode, onModeChange}
}
