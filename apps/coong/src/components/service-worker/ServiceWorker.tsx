import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  ParentProps,
  Show,
  untrack,
  useContext,
} from 'solid-js'
import {freeze, getWindow} from '@winter-love/utils'

type ServiceWorkerState =
  | 'active'
  | 'error'
  | 'installing'
  | 'waiting'
  | 'initializing'
  | 'skip-update'

export interface ServiceWorkerInfo {
  offline: boolean
  state: ServiceWorkerState
}

export type ServiceWorkerContextValue = [
  Accessor<ServiceWorkerInfo>,
  {
    handleSkipUpdate: () => void
    handleSkipWaiting: () => Promise<boolean>
  },
]

export const createServiceWorker = (path: string): Readonly<ServiceWorkerContextValue> => {
  const [state, setState] = createSignal<ServiceWorkerInfo>({
    offline: false,
    state: 'initializing',
  })
  let _registration: ServiceWorkerRegistration | undefined
  let cancelPendingSkipWaiting: (() => void) | undefined
  let pendingSkipWaiting: Promise<boolean> | undefined

  const handleSkipWaiting = () => {
    if (pendingSkipWaiting) {
      return pendingSkipWaiting
    }

    const serviceWorker = getWindow()?.navigator.serviceWorker
    const waitingWorker = _registration?.waiting

    if (!serviceWorker || !waitingWorker) {
      return Promise.resolve(true)
    }

    pendingSkipWaiting = new Promise<boolean>((resolve) => {
      const finish = (didActivate: boolean) => {
        serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        waitingWorker.removeEventListener('statechange', handleStateChange)
        cancelPendingSkipWaiting = undefined
        pendingSkipWaiting = undefined
        resolve(didActivate)
      }

      const handleControllerChange = () => {
        finish(true)
      }

      const handleStateChange = () => {
        if (waitingWorker.state === 'redundant') {
          finish(false)
        }
      }

      serviceWorker.addEventListener('controllerchange', handleControllerChange, {once: true})
      waitingWorker.addEventListener('statechange', handleStateChange)
      cancelPendingSkipWaiting = () => finish(false)
      waitingWorker.postMessage({type: 'SKIP_WAITING'})
    })

    return pendingSkipWaiting
  }

  const handleSkipUpdate = () => {
    if (!_registration || !_registration.waiting) {
      return
    }

    setState((prev) => ({...prev, state: 'skip-update'}))
  }

  createEffect(() => {
    const window = getWindow()
    const {navigator} = window || {}
    const {serviceWorker} = navigator || {}

    if (import.meta.env.DEV || !window || !navigator || !serviceWorker) {
      return
    }

    let registration: ServiceWorkerRegistration | undefined
    let installingWorker: ServiceWorker | null = null
    let cancelled = false

    const syncState = () => {
      if (!registration) {
        return
      }

      if (registration.installing) {
        setState((prev) => ({...prev, state: 'installing'}))
      } else if (registration.waiting) {
        setState((prev) => ({...prev, state: 'waiting'}))
      } else if (registration.active) {
        setState((prev) => ({...prev, state: 'active'}))
      }
    }

    const detachInstallingWorker = () => {
      installingWorker?.removeEventListener('statechange', syncState)
      installingWorker = null
    }

    const attachInstallingWorker = () => {
      detachInstallingWorker()
      installingWorker = registration?.installing ?? null
      installingWorker?.addEventListener('statechange', syncState)
    }

    const updatefound = () => {
      setState((prev) => ({...prev, state: 'installing'}))
      attachInstallingWorker()
    }

    const startRegistration = async () => {
      try {
        const reg = await serviceWorker.register(path)

        if (cancelled) {
          return
        }

        registration = reg
        _registration = reg

        reg.addEventListener('updatefound', updatefound)
        attachInstallingWorker()
        syncState()
      } catch {
        if (!cancelled) {
          setState({offline: true, state: 'error'})
        }
      }
    }

    startRegistration()

    onCleanup(() => {
      cancelled = true

      if (registration) {
        registration.removeEventListener('updatefound', updatefound)
      }

      detachInstallingWorker()
      cancelPendingSkipWaiting?.()
      _registration = undefined
    })
  })

  return freeze([untrack(() => state), {handleSkipUpdate, handleSkipWaiting}])
}

export const ServiceWorkerContext = createContext<Readonly<ServiceWorkerContextValue>>([
  () =>
    ({
      offline: false,
      state: 'initializing',
    }) as const,
  {
    handleSkipUpdate: () => {
      if (import.meta.env.PROD) {
        throw new Error('handleSkipUpdate is not implemented')
      }
    },
    handleSkipWaiting: () => {
      if (import.meta.env.PROD) {
        throw new Error('handleSkipWaiting is not implemented')
      }

      return Promise.resolve(true)
    },
  },
])

export interface ServiceWorkerProviderProps extends ParentProps {
  src: string
}

export const ServiceWorkerProvider = (props: ServiceWorkerProviderProps) => {
  const source = untrack(() => props.src)
  const context = createServiceWorker(source)
  const isProduction = import.meta.env.PROD

  return (
    <Show when={isProduction} fallback={props.children}>
      <ServiceWorkerContext.Provider value={context}>
        {props.children}
      </ServiceWorkerContext.Provider>
    </Show>
  )
}

export const useServiceWorker = (): Readonly<ServiceWorkerContextValue> => {
  return useContext(ServiceWorkerContext)
}
