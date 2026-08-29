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
  let removeModeListener: (() => void) | null = null
  let isDisposed = false
  const surfaceOwner = props.isSurfaceOwner ?? false

  const publishMode = (nextMode: DesktopMode) => {
    writeDesktopMode(nextMode)
    setMode(nextMode)
    channel?.postMessage(nextMode)
  }

  const onModeChange = async (nextMode: DesktopMode) => {
    if (!import.meta.env.POMO_IS_DESKTOP || isChanging() || nextMode === mode()) {
      return
    }

    setIsChanging(true)
    setError(null)
    const previousMode = mode()
    let transitionApplied = false
    try {
      await applyDesktopMode(nextMode)
      transitionApplied = true

      await prepareDesktopModeTransition(nextMode)
      publishMode(nextMode)
      await finishDesktopModeTransition(nextMode)
    } catch (transitionError: unknown) {
      let reportedError = transitionError

      if (transitionApplied) {
        try {
          await applyDesktopMode(previousMode)
          if (mode() !== previousMode) {
            publishMode(previousMode)
          }
        } catch (rollbackError: unknown) {
          reportedError = new AggregateError(
            [transitionError, rollbackError],
            'Desktop mode transition and rollback failed',
          )
        }
      }

      setError(getDesktopErrorMessage(reportedError))
      throw reportedError
    } finally {
      setIsChanging(false)
    }
  }

  const requestMode = async (nextMode: DesktopMode) => {
    try {
      await onModeChange(nextMode)
    } catch {}
  }

  onMount(() => {
    if (!import.meta.env.POMO_IS_DESKTOP) {
      return
    }

    channel = new BroadcastChannel(MODE_CHANNEL)
    channel.addEventListener('message', (event) => {
      if (isDesktopMode(event.data)) {
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
