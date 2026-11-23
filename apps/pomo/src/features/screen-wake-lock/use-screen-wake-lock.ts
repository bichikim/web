import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
import {type Accessor, createEffect, createSignal, onCleanup, onMount, untrack} from 'solid-js'
import {type CapabilityAvailability, useCapabilityTask} from 'src/hooks/use-capability-task'
import {browserWakeLock} from './browser-wake-lock'

export type ScreenWakeLockAvailability = CapabilityAvailability

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
  readonly onDispose: () => void
  readonly onVisible: () => void
}

const startWakeLockLifecycle = (options: WakeLockLifecycleOptions) => {
  const onVisibilityChange = () => {
    if (browserWakeLock.isVisible() && options.isEnabled()) {
      options.onVisible()
    }
  }

  onCleanup(browserWakeLock.subscribeVisibility(onVisibilityChange))
  onCleanup(options.onDispose)
}

const createBrowserWakeLockRelease = (
  onFinished: (sentinel: WakeLockSentinel, succeeded: boolean) => void,
) => {
  let pending = false
  const release = (sentinel: WakeLockSentinel | null) => {
    if (sentinel === null || sentinel.released || pending) {
      return
    }
    pending = true
    const finish = (succeeded: boolean) => {
      pending = false
      onFinished(sentinel, succeeded)
    }
    sentinel.release().then(
      () => finish(true),
      () => finish(false),
    )
  }
  return {isPending: () => pending, release}
}

export const useScreenWakeLock = (): ScreenWakeLockController => {
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isEnabled, setIsEnabled] = createSignal(false)
  const requestQueue = createSerialTaskQueue()
  const wakeLockTask = useCapabilityTask({
    capability: () =>
      import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' || browserWakeLock.isSupported(),
    task: (enabled: boolean) =>
      import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
        ? requestQueue.run(() => requestAppsInTossWakeLock(enabled))
        : acquireWakeLock(),
  })
  const {availability} = wakeLockTask
  const isRequestPending = () =>
    wakeLockTask.state().status === 'pending' &&
    (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' || (isEnabled() && sentinel === null))
  let requestRevision = 0
  let appsInTossWakeLockRequested = false
  let disposed = false
  let sentinel: WakeLockSentinel | null = null

  createEffect(() => {
    const state = wakeLockTask.state()
    untrack(() => {
      if (state.status === 'error') {
        setErrorMessage(isEnabled() ? APPS_IN_TOSS_ENABLE_ERROR : SCREEN_WAKE_LOCK_DISABLE_ERROR)
        setIsEnabled(false)
      }
    })
  })

  const setAppsInTossWakeLock = (nextEnabled: boolean): void => {
    appsInTossWakeLockRequested ||= nextEnabled
    setErrorMessage(null)
    wakeLockTask.execute(nextEnabled).catch(() => undefined)
  }

  const browserRelease = createBrowserWakeLockRelease((released, succeeded) => {
    if (succeeded || released.released) {
      sentinel = null
    }
    if (disposed) {
      return
    }
    if (!succeeded && !isEnabled()) {
      setIsEnabled(sentinel !== null)
      setErrorMessage(SCREEN_WAKE_LOCK_DISABLE_ERROR)
    } else if (isEnabled() && sentinel === null) {
      requestWakeLock()
    }
  })

  const acquireWakeLock = async () => {
    if (
      disposed ||
      availability() !== 'supported' ||
      !isEnabled() ||
      (sentinel !== null && !sentinel.released)
    ) {
      return
    }

    const revision = requestRevision
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
          if (!browserRelease.isPending() && isEnabled() && browserWakeLock.isVisible()) {
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
    }
  }

  const requestWakeLock = () => {
    if (!browserRelease.isPending() && !isRequestPending()) {
      wakeLockTask.execute(true).catch(() => undefined)
    }
  }

  const onEnabledChange = (nextEnabled: boolean) => {
    setErrorMessage(null)
    setIsEnabled(nextEnabled)

    if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
      setAppsInTossWakeLock(nextEnabled)
      return
    }

    requestRevision += 1
    wakeLockTask.reset()

    if (nextEnabled) {
      requestWakeLock()
      return
    }

    browserRelease.release(sentinel)
  }

  createEffect(() => {
    const supported = availability() === 'supported'
    untrack(() => {
      if (supported && isEnabled() && !isRequestPending()) {
        if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
          setAppsInTossWakeLock(true)
        } else {
          requestWakeLock()
        }
      }
    })
  })

  onMount(() => {
    const native = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
    if (!native && !browserWakeLock.isSupported()) {
      return
    }
    startWakeLockLifecycle({
      isEnabled,
      onDispose: () => {
        disposed = true
        requestRevision += 1
        wakeLockTask.reset()
        setIsEnabled(false)
        if (!native) {
          browserRelease.release(sentinel)
        } else if (appsInTossWakeLockRequested) {
          requestQueue.run(() => requestAppsInTossWakeLock(false)).catch(() => undefined)
        }
      },
      onVisible: native ? () => setAppsInTossWakeLock(true) : requestWakeLock,
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
