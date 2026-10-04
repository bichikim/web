import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {type CapabilityAvailability, useCapabilityTask} from 'src/hooks/use-capability-task'

export type FullscreenAvailability = CapabilityAvailability
export type FullscreenError = 'enter-failed' | 'exit-failed'

export interface FullscreenController {
  readonly availability: Accessor<FullscreenAvailability>
  readonly error: Accessor<FullscreenError | null>
  readonly isEnabled: Accessor<boolean>
  readonly isRequestPending: Accessor<boolean>
  readonly onEnabledChange: (isEnabled: boolean) => void
}

const isFullscreenSupported = (): boolean =>
  document.fullscreenEnabled &&
  typeof document.documentElement.requestFullscreen === 'function' &&
  typeof document.exitFullscreen === 'function'

const getFullscreenState = (): boolean => document.fullscreenElement !== null

/** Tracks document-wide fullscreen state and requests fullscreen on the document element. */
export const useFullscreen = (): FullscreenController => {
  const [error, setError] = createSignal<FullscreenError | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  let disposed = false
  let requestError: FullscreenError = 'enter-failed'

  const handleFullscreenChange = () => {
    setIsEnabled(getFullscreenState())
    setError(null)
  }

  const changeFullscreen = async (nextEnabled: boolean) => {
    setError(null)
    setIsEnabled(nextEnabled)
    requestError = nextEnabled ? 'enter-failed' : 'exit-failed'

    try {
      if (nextEnabled) {
        await document.documentElement.requestFullscreen()
      } else if (getFullscreenState()) {
        await document.exitFullscreen()
      }

      if (disposed) {
        return
      }

      const actualState = getFullscreenState()
      setIsEnabled(actualState)
      if (actualState !== nextEnabled) {
        throw new Error('Fullscreen state does not match the requested state')
      }
    } catch (cause: unknown) {
      if (disposed) {
        return
      }

      setIsEnabled(getFullscreenState())
      setError(requestError)
      throw cause
    }
  }

  const task = useCapabilityTask({
    capability: isFullscreenSupported,
    concurrency: 'exhaust',
    task: changeFullscreen,
  })
  const isRequestPending = () => task.state().status === 'pending'
  // The UI consumes domain error state rather than promise rejections.
  const onEnabledChange = (nextEnabled: boolean) => task.execute(nextEnabled).catch(() => undefined)

  const handleFullscreenError = () => {
    setIsEnabled(getFullscreenState())
  }

  onCleanup(() => {
    disposed = true
  })

  onMount(() => {
    if (task.availability() !== 'supported') {
      return
    }

    setIsEnabled(getFullscreenState())
    useEvent(document, 'fullscreenchange', handleFullscreenChange)
    useEvent(document, 'fullscreenerror', handleFullscreenError)
  })

  return {availability: task.availability, error, isEnabled, isRequestPending, onEnabledChange}
}
