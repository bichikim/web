import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

export type ScreenWakeLockAvailability = 'checking' | 'supported' | 'unsupported'

const APPS_IN_TOSS_ENABLE_ERROR = '화면 유지 요청을 허용하지 못했어요. 앱 설정을 확인해 주세요.'
const SCREEN_WAKE_LOCK_DISABLE_ERROR =
  '화면 유지 기능을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.'

export interface ScreenWakeLockController {
  readonly availability: Accessor<ScreenWakeLockAvailability>
  readonly errorMessage: Accessor<string | null>
  readonly isEnabled: Accessor<boolean>
  readonly isRequestPending: Accessor<boolean>
  readonly onEnabledChange: (isEnabled: boolean) => void
}

const loadAppsInTossWakeLockModule = () => import('@apps-in-toss/web-framework')

interface BrowserWakeLockLifecycleOptions {
  readonly isEnabled: Accessor<boolean>
  readonly onAvailabilityChange: (availability: ScreenWakeLockAvailability) => void
  readonly onDispose: () => void
  readonly onVisible: () => void
}

const startBrowserWakeLockLifecycle = (
  options: BrowserWakeLockLifecycleOptions,
): (() => void) | undefined => {
  const supportsWakeLock =
    'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function'

  if (!supportsWakeLock) {
    options.onAvailabilityChange('unsupported')
    return undefined
  }

  options.onAvailabilityChange('supported')
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && options.isEnabled()) {
      options.onVisible()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    options.onDispose()
  }
}

export const useScreenWakeLock = (): ScreenWakeLockController => {
  const [availability, setAvailability] = createSignal<ScreenWakeLockAvailability>('checking')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  const [isRequestPending, setIsRequestPending] = createSignal(false)
  let appsInTossRequestQueue = Promise.resolve()
  let appsInTossWakeLockRequested = false
  let disposed = false
  let sentinel: WakeLockSentinel | null = null

  const setAppsInTossWakeLock = (nextEnabled: boolean, reportResult = true): void => {
    appsInTossWakeLockRequested ||= nextEnabled

    if (reportResult) {
      setIsRequestPending(true)
      setErrorMessage(null)
    }

    const request = appsInTossRequestQueue.then(async () => {
      const {Screen} = await loadAppsInTossWakeLockModule()
      const result = await Screen.setAwakeMode({enabled: nextEnabled})

      if (result.enabled !== nextEnabled) {
        throw new Error('Apps in Toss returned an unexpected screen awake state')
      }
    })
    appsInTossRequestQueue = request.catch(() => undefined)

    request
      .then(() => {
        if (!reportResult || disposed || isEnabled() !== nextEnabled) {
          return
        }

        setIsRequestPending(false)
      })
      .catch(() => {
        if (!reportResult || disposed || isEnabled() !== nextEnabled) {
          return
        }

        setIsEnabled(false)
        setIsRequestPending(false)
        setErrorMessage(nextEnabled ? APPS_IN_TOSS_ENABLE_ERROR : SCREEN_WAKE_LOCK_DISABLE_ERROR)
      })
  }

  const releaseWakeLock = () => {
    const currentSentinel = sentinel
    sentinel = null

    if (currentSentinel === null || currentSentinel.released) {
      return
    }

    currentSentinel.release().catch(() => {
      setErrorMessage(SCREEN_WAKE_LOCK_DISABLE_ERROR)
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
    acquireWakeLock()
  }

  const onEnabledChange = (nextEnabled: boolean) => {
    setErrorMessage(null)
    setIsEnabled(nextEnabled)

    if (import.meta.env.POMO_IS_APPS_IN_TOSS) {
      setAppsInTossWakeLock(nextEnabled)
      return
    }

    if (nextEnabled) {
      requestWakeLock()
      return
    }

    releaseWakeLock()
  }

  onMount(() => {
    if (import.meta.env.POMO_IS_APPS_IN_TOSS) {
      setAvailability('supported')
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isEnabled()) {
          setAppsInTossWakeLock(true)
        }
      }

      useEvent(document, 'visibilitychange', handleVisibilityChange)
      onCleanup(() => {
        disposed = true
        setIsEnabled(false)

        if (appsInTossWakeLockRequested) {
          setAppsInTossWakeLock(false, false)
        }
      })
      return
    }

    const disposeBrowserWakeLock = startBrowserWakeLockLifecycle({
      isEnabled,
      onAvailabilityChange: setAvailability,
      onDispose: () => {
        setIsEnabled(false)
        releaseWakeLock()
      },
      onVisible: requestWakeLock,
    })

    if (disposeBrowserWakeLock !== undefined) {
      onCleanup(disposeBrowserWakeLock)
    }
  })

  return {
    availability,
    errorMessage,
    isEnabled,
    isRequestPending,
    onEnabledChange,
  }
}
