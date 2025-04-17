import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  ParentProps,
  untrack,
  useContext,
} from 'solid-js'
import {freeze, getWindow} from '@winter-love/utils'

type ServiceWorkerState =
  | 'active'
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

export const createServiceWorker = (
  path: string,
): Readonly<ServiceWorkerContextValue> => {
  const [state, setState] = createSignal<ServiceWorkerInfo>({
    offline: false,
    state: 'initializing',
  })
  let _registration: ServiceWorkerRegistration | undefined

  const handleSkipWaiting = () => {
    return new Promise<boolean>((resolve, reject) => {
      if (!_registration || !_registration.waiting) {
        resolve(true)

        return
      }

      _registration.waiting.addEventListener('statechange', () => {
        if (!_registration) {
          reject(new Error('Service worker registration not found'))

          return
        }

        if (_registration.active) {
          resolve(true)
        }
      })
      _registration.waiting.postMessage({type: 'SKIP_WAITING'})
    })
  }

  const handleSkipUpdate = () => {
    if (!_registration || !_registration.waiting) {
      return
    }

    setState((prev) => ({...prev, state: 'skip-update'}))
  }

  createEffect(async () => {
    const window = getWindow()
    const {navigator} = window || {}
    const {serviceWorker} = navigator || {}

    if (import.meta.env.DEV || !window || !navigator || !serviceWorker) {
      return
    }

    const registration = await serviceWorker.register(path)

    _registration = registration

    const statechange = () => {
      if (registration.installing) {
        setState((prev) => ({...prev, state: 'installing'}))
      } else if (registration.waiting) {
        setState((prev) => ({...prev, state: 'waiting'}))
      } else if (registration.active) {
        setState((prev) => ({...prev, state: 'active'}))
      }
    }

    const updatefound = () => {
      setState((prev) => ({...prev, state: 'installing'}))
      registration.installing?.addEventListener('statechange', statechange)
    }

    registration.addEventListener('updatefound', updatefound)
    registration.addEventListener('statechange', statechange)

    onCleanup(() => {
      registration.removeEventListener('updatefound', updatefound)
      registration.removeEventListener('statechange', statechange)
    })
  })

  return freeze([state, {handleSkipUpdate, handleSkipWaiting}])
}

export const ServiceWorkerContext = createContext<Readonly<ServiceWorkerContextValue>>([
  () =>
    ({
      offline: false,
      state: 'initializing',
    }) as const,
  {
    handleSkipUpdate: () => {
      throw new Error('handleSkipUpdate is not implemented')
    },
    handleSkipWaiting: () => {
      throw new Error('handleSkipWaiting is not implemented')
    },
  },
])

export interface ServiceWorkerProviderProps extends ParentProps {
  src: string
}

export const ServiceWorkerProvider = (props: ServiceWorkerProviderProps) => {
  const source = untrack(() => props.src)
  const context = createServiceWorker(source)

  return (
    <ServiceWorkerContext.Provider value={context}>
      {props.children}
    </ServiceWorkerContext.Provider>
  )
}

export const useServiceWorker = (): Readonly<ServiceWorkerContextValue> => {
  return useContext(ServiceWorkerContext)
}
