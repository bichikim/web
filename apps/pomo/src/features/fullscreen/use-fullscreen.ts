import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

export type FullscreenAvailability = 'checking' | 'supported' | 'unsupported'
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

export const useFullscreen = (): FullscreenController => {
  const [availability, setAvailability] = createSignal<FullscreenAvailability>('checking')
  const [error, setError] = createSignal<FullscreenError | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  const [isRequestPending, setIsRequestPending] = createSignal(false)
  let disposed = false

  const handleFullscreenChange = () => {
    setIsEnabled(getFullscreenState())
    setError(null)
  }

  const changeFullscreen = async (nextEnabled: boolean) => {
    if (availability() !== 'supported' || isRequestPending()) {
      return
    }

    setError(null)
    setIsEnabled(nextEnabled)
    setIsRequestPending(true)

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
        setError(nextEnabled ? 'enter-failed' : 'exit-failed')
      }
    } catch {
      if (disposed) {
        return
      }

      setIsEnabled(getFullscreenState())
      setError(nextEnabled ? 'enter-failed' : 'exit-failed')
    } finally {
      if (!disposed) {
        setIsRequestPending(false)
      }
    }
  }

  const onEnabledChange = (nextEnabled: boolean) => changeFullscreen(nextEnabled)

  onMount(() => {
    if (!isFullscreenSupported()) {
      setAvailability('unsupported')
      return
    }

    setAvailability('supported')
    setIsEnabled(getFullscreenState())
    useEvent(document, 'fullscreenchange', handleFullscreenChange)
    onCleanup(() => {
      disposed = true
    })
  })

  return {availability, error, isEnabled, isRequestPending, onEnabledChange}
}
