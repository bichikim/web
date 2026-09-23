import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {browserWakeLock} from './browser-wake-lock'

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

const requestAppsInTossWakeLock = async (enabled: boolean) => {
  const {Screen} = await import('@apps-in-toss/web-framework')
  const result = await Screen.setAwakeMode({enabled})

  if (result.enabled !== enabled) {
    throw new Error('Apps in Toss returned an unexpected screen awake state')
  }
}

interface WakeLockLifecycleOptions {
  readonly isEnabled: Accessor<boolean>
  readonly onAvailabilityChange: (availability: ScreenWakeLockAvailability) => void
  readonly onDispose: () => void
  readonly onVisible: () => void
}

const startBrowserWakeLockLifecycle = (
  options: WakeLockLifecycleOptions,
): (() => void) | undefined => {
  const supportsWakeLock = browserWakeLock.isSupported()

  if (!supportsWakeLock) {
    options.onAvailabilityChange('unsupported')
    return undefined
  }

  options.onAvailabilityChange('supported')
  const handleVisibilityChange = () => {
    if (browserWakeLock.isVisible() && options.isEnabled()) {
      options.onVisible()
    }
  }

  const unsubscribe = browserWakeLock.subscribeVisibility(handleVisibilityChange)

  return () => {
    unsubscribe()
    options.onDispose()
  }
}

const startAppsInTossWakeLockLifecycle = (options: WakeLockLifecycleOptions) => {
  options.onAvailabilityChange('supported')
  const handleVisibilityChange = () => {
    if (browserWakeLock.isVisible() && options.isEnabled()) {
      options.onVisible()
    }
  }

  onCleanup(browserWakeLock.subscribeVisibility(handleVisibilityChange))
  onCleanup(options.onDispose)
}

const releaseBrowserWakeLock = (sentinel: WakeLockSentinel | null, onError: () => void) => {
  if (sentinel === null || sentinel.released) {
    return
  }

  sentinel.release().catch(onError)
}

export const useScreenWakeLock = (): ScreenWakeLockController => {
  const [availability, setAvailability] = createSignal<ScreenWakeLockAvailability>('checking')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  const [isRequestPending, setIsRequestPending] = createSignal(false)
  const requestQueue = createSerialTaskQueue()
  let requestRevision = 0
  let appsInTossWakeLockRequested = false
  let disposed = false
  let sentinel: WakeLockSentinel | null = null

  const setAppsInTossWakeLock = (nextEnabled: boolean, reportResult = true): void => {
    requestRevision += 1
    const revision = requestRevision
    appsInTossWakeLockRequested ||= nextEnabled

    if (reportResult) {
      setIsRequestPending(true)
      setErrorMessage(null)
    }

    const request = requestQueue.run(() => requestAppsInTossWakeLock(nextEnabled))

    request
      .then(() => {
        if (!reportResult || disposed || revision !== requestRevision) {
          return
        }

        setIsRequestPending(false)
      })
      .catch(() => {
        if (!reportResult || disposed || revision !== requestRevision) {
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

    const revision = requestRevision
    releaseBrowserWakeLock(currentSentinel, () => {
      if (!disposed && revision === requestRevision) {
        setErrorMessage(SCREEN_WAKE_LOCK_DISABLE_ERROR)
      }
    })
  }

  const acquireWakeLock = async () => {
    if (
      disposed ||
      availability() !== 'supported' ||
      !isEnabled() ||
      isRequestPending() ||
      (sentinel !== null && !sentinel.released)
    ) {
      return
    }

    const revision = requestRevision
    setIsRequestPending(true)
    setErrorMessage(null)

    try {
      const acquiredSentinel = await browserWakeLock.request()

      if (disposed || revision !== requestRevision || !isEnabled()) {
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
          if (isEnabled() && browserWakeLock.isVisible()) {
            setIsEnabled(false)
            setErrorMessage('화면 유지가 해제되었어요. 다시 켜 주세요.')
          }
        },
        {once: true},
      )
    } catch {
      if (!disposed && revision === requestRevision) {
        setIsEnabled(false)
        setErrorMessage('화면 유지 요청을 허용하지 못했어요. 브라우저 설정을 확인해 주세요.')
      }
    } finally {
      if (!disposed && revision === requestRevision) {
        setIsRequestPending(false)
      }
    }
  }

  const requestWakeLock = () => {
    acquireWakeLock()
  }

  const onEnabledChange = (nextEnabled: boolean) => {
    setErrorMessage(null)
    setIsEnabled(nextEnabled)

    if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
      setAppsInTossWakeLock(nextEnabled)
      return
    }

    requestRevision += 1
    setIsRequestPending(false)

    if (nextEnabled) {
      requestWakeLock()
      return
    }

    releaseWakeLock()
  }

  onMount(() => {
    if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
      startAppsInTossWakeLockLifecycle({
        isEnabled,
        onAvailabilityChange: setAvailability,
        onDispose: () => {
          disposed = true
          setIsEnabled(false)

          if (appsInTossWakeLockRequested) {
            setAppsInTossWakeLock(false, false)
          }
        },
        onVisible: () => setAppsInTossWakeLock(true),
      })
      return
    }

    const disposeBrowserWakeLock = startBrowserWakeLockLifecycle({
      isEnabled,
      onAvailabilityChange: setAvailability,
      onDispose: () => {
        disposed = true
        requestRevision += 1
        setIsRequestPending(false)
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
