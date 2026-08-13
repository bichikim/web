import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

export type ScreenWakeLockAvailability = 'checking' | 'supported' | 'unsupported'

export interface ScreenWakeLockController {
  readonly availability: Accessor<ScreenWakeLockAvailability>
  readonly errorMessage: Accessor<string | null>
  readonly isEnabled: Accessor<boolean>
  readonly isRequestPending: Accessor<boolean>
  readonly onEnabledChange: (isEnabled: boolean) => void
}

export const useScreenWakeLock = (): ScreenWakeLockController => {
  const [availability, setAvailability] = createSignal<ScreenWakeLockAvailability>('checking')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  const [isRequestPending, setIsRequestPending] = createSignal(false)
  let sentinel: WakeLockSentinel | null = null

  const releaseWakeLock = () => {
    const currentSentinel = sentinel
    sentinel = null

    if (currentSentinel === null || currentSentinel.released) {
      return
    }

    currentSentinel.release().catch(() => {
      setErrorMessage('화면 유지 기능을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.')
    })
  }

  const acquireWakeLock = async () => {
    if (
      availability() !== 'supported' ||
      !isEnabled() ||
      isRequestPending() ||
      (sentinel !== null && !sentinel.released)
    ) {
      return
    }

    setIsRequestPending(true)
    setErrorMessage(null)

    try {
      const acquiredSentinel = await navigator.wakeLock.request('screen')

      if (!isEnabled()) {
        await acquiredSentinel.release()
        return
      }

      sentinel = acquiredSentinel
      acquiredSentinel.addEventListener(
        'release',
        () => {
          if (sentinel !== acquiredSentinel) {
            return
          }

          sentinel = null
          if (isEnabled() && document.visibilityState === 'visible') {
            setIsEnabled(false)
            setErrorMessage('화면 유지가 해제되었어요. 다시 켜 주세요.')
          }
        },
        {once: true},
      )
    } catch {
      setIsEnabled(false)
      setErrorMessage('화면 유지 요청을 허용하지 못했어요. 브라우저 설정을 확인해 주세요.')
    } finally {
      setIsRequestPending(false)
    }
  }

  const requestWakeLock = () => {
    acquireWakeLock().catch(() => {
      setIsEnabled(false)
      setIsRequestPending(false)
      setErrorMessage('화면 유지 요청 중 예상하지 못한 문제가 발생했어요.')
    })
  }

  const onEnabledChange = (nextEnabled: boolean) => {
    setErrorMessage(null)
    setIsEnabled(nextEnabled)

    if (nextEnabled) {
      requestWakeLock()
      return
    }

    releaseWakeLock()
  }

  onMount(() => {
    const supportsWakeLock =
      'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function'

    if (!supportsWakeLock) {
      setAvailability('unsupported')
      return
    }

    setAvailability('supported')
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled()) {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    onCleanup(() => {
      setIsEnabled(false)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseWakeLock()
    })
  })

  return {
    availability,
    errorMessage,
    isEnabled,
    isRequestPending,
    onEnabledChange,
  }
}
