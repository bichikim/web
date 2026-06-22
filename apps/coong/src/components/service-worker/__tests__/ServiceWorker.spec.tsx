/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {getWindow} from '@winter-love/utils'
import {
  createServiceWorker,
  type ServiceWorkerContextValue,
  ServiceWorkerProvider,
} from '../ServiceWorker'

vi.mock('@winter-love/utils', async () => {
  const actual = await vi.importActual<typeof import('@winter-love/utils')>('@winter-love/utils')

  return {
    ...actual,
    getWindow: vi.fn(),
  }
})

type MockRegistration = {
  active: ServiceWorker | null
  addEventListener: ReturnType<typeof vi.fn>
  emit: (type: 'statechange' | 'updatefound') => void
  installing: ServiceWorker | null
  removeEventListener: ReturnType<typeof vi.fn>
  waiting: ServiceWorker | null
}

const asServiceWorkerRegistration = (registration: MockRegistration): ServiceWorkerRegistration =>
  registration as unknown as ServiceWorkerRegistration

const createMockRegistration = (): MockRegistration => {
  const listeners = new Map<string, Set<EventListener>>()

  const registration = {
    active: null as ServiceWorker | null,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set<EventListener>()

      set.add(listener)
      listeners.set(type, set)
    }),
    emit(type: 'statechange' | 'updatefound') {
      listeners.get(type)?.forEach((listener) => {
        listener(new Event(type))
      })
    },
    installing: null as ServiceWorker | null,
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    }),
    waiting: null as ServiceWorker | null,
  }

  return registration
}

const createMockWindow = (register: ServiceWorkerContainer['register']): Window =>
  ({
    navigator: {
      serviceWorker: {
        register,
      },
    },
  }) as unknown as Window

const createMockServiceWorker = () => {
  const register = vi.fn<(path: string) => Promise<ServiceWorkerRegistration>>()

  vi.mocked(getWindow).mockReturnValue(createMockWindow(register))

  return register
}

const renderCreateServiceWorker = (path = '/sw.js') => {
  let context: Readonly<ServiceWorkerContextValue> | undefined

  render(() =>
    createComponent(() => {
      context = createServiceWorker(path)

      return null
    }, {}),
  )

  return {
    getContext: () => {
      if (!context) {
        throw new Error('Service worker context was not initialized')
      }

      return context
    },
  }
}

const flushPromises = () => Promise.resolve()

describe('createServiceWorker', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('should skip registration in development', () => {
    const register = createMockServiceWorker()

    renderCreateServiceWorker('/sw.js')

    expect(register).not.toHaveBeenCalled()
  })

  it('should register the service worker with the given path in production', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()

    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    renderCreateServiceWorker('/sw.js')

    await flushPromises()

    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('should update state to active when the registration becomes active', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()

    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    const {getContext} = renderCreateServiceWorker('/sw.js')

    await flushPromises()

    registration.active = {} as ServiceWorker
    registration.emit('statechange')

    expect(getContext()[0]().state).toBe('active')
  })

  it('should update state to installing when an update is found', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()

    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    const {getContext} = renderCreateServiceWorker('/sw.js')

    await flushPromises()

    registration.emit('updatefound')

    expect(getContext()[0]().state).toBe('installing')
  })

  it('should remove registration listeners on cleanup', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()

    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    const {unmount} = render(() =>
      createComponent(() => {
        createServiceWorker('/sw.js')

        return null
      }, {}),
    )

    await flushPromises()
    unmount()

    expect(registration.removeEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function),
    )
    expect(registration.removeEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function),
    )
  })

  it('should ignore registration results that resolve after cleanup', async () => {
    vi.stubEnv('DEV', false)

    let resolveRegistration: (registration: MockRegistration) => void = () => {}
    const register = createMockServiceWorker()

    register.mockImplementation(
      () =>
        new Promise<ServiceWorkerRegistration>((resolve) => {
          resolveRegistration = (registration) => {
            resolve(asServiceWorkerRegistration(registration))
          }
        }),
    )

    let getContextRef: () => Readonly<ServiceWorkerContextValue> = () => {
      throw new Error('Service worker context was not initialized')
    }

    const {unmount} = render(() =>
      createComponent(() => {
        const context = createServiceWorker('/sw.js')

        getContextRef = () => context

        return null
      }, {}),
    )

    unmount()

    const registration = createMockRegistration()

    resolveRegistration(registration)
    await flushPromises()

    expect(registration.addEventListener).not.toHaveBeenCalled()
    expect(getContextRef()[0]().state).toBe('initializing')
  })

  it('should resolve handleSkipWaiting when no waiting worker exists', () => {
    const {getContext} = renderCreateServiceWorker('/sw.js')

    return expect(getContext()[1].handleSkipWaiting()).resolves.toBe(true)
  })

  it('should post SKIP_WAITING when a waiting worker exists', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()
    const postMessage = vi.fn()
    let onStateChange: (() => void) | undefined

    registration.waiting = {
      addEventListener: vi.fn((event, listener) => {
        if (event === 'statechange') {
          onStateChange = listener as () => void
        }
      }),
      postMessage,
    } as unknown as ServiceWorker

    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    const {getContext} = renderCreateServiceWorker('/sw.js')

    await flushPromises()

    const skipWaiting = getContext()[1].handleSkipWaiting()

    expect(postMessage).toHaveBeenCalledWith({type: 'SKIP_WAITING'})

    registration.active = {} as ServiceWorker
    onStateChange?.()

    return expect(skipWaiting).resolves.toBe(true)
  })

  it('should set skip-update state from handleSkipUpdate when a waiting worker exists', async () => {
    vi.stubEnv('DEV', false)

    const register = createMockServiceWorker()
    const registration = createMockRegistration()

    registration.waiting = {} as ServiceWorker
    register.mockResolvedValue(asServiceWorkerRegistration(registration))

    const {getContext} = renderCreateServiceWorker('/sw.js')

    await flushPromises()

    getContext()[1].handleSkipUpdate()

    expect(getContext()[0]().state).toBe('skip-update')
  })

  it('should no-op handleSkipUpdate when no waiting worker exists', () => {
    const {getContext} = renderCreateServiceWorker('/sw.js')

    getContext()[1].handleSkipUpdate()

    expect(getContext()[0]().state).toBe('initializing')
  })
})

describe('ServiceWorkerProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should render children without wrapping the provider in development', () => {
    vi.stubEnv('PROD', false)

    const {getByText} = render(() => (
      <ServiceWorkerProvider src="/sw.js">
        <span>child</span>
      </ServiceWorkerProvider>
    ))

    expect(getByText('child')).toBeInTheDocument()
  })
})
