/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render, renderHook} from '@solidjs/testing-library'
import {createComponent, useContext} from 'solid-js'

const mocks = vi.hoisted(() => {
  return {
    createDelegatedEvent: vi.fn(),
    delegatedEmit: vi.fn(),
    delegatedOn: vi.fn(),
  }
})

vi.mock('src/utils/focus-controller/delegated-event', () => {
  return {
    DEFAULT_CHANNEL_PREFIX: '',
    createDelegatedEvent: mocks.createDelegatedEvent,
    delegatedEmit: mocks.delegatedEmit,
    delegatedOn: mocks.delegatedOn,
  }
})

const importSubject = async (options: {isServer: boolean} = {isServer: false}) => {
  vi.resetModules()

  vi.doMock('solid-js/web', async () => {
    const actual = await vi.importActual<typeof import('solid-js/web')>('solid-js/web')

    return {
      ...actual,
      isServer: options.isServer,
    }
  })

  return await import('../DelegatedEvent')
}

describe('DelegatedEvent', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mocks.createDelegatedEvent.mockReset()
    mocks.delegatedEmit.mockReset()
    mocks.delegatedOn.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('DelegatedEventProvider should provide context values and cleanup on unmount', async () => {
    const {DelegatedEventContext, DelegatedEventProvider} = await importSubject({isServer: false})
    const delegatedEventMap = new Map()
    const unsubscribe = vi.fn()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe})

    let providedContext: unknown = undefined

    const MockChild = () => {
      providedContext = useContext(DelegatedEventContext)

      return null
    }

    const {unmount} = render(() =>
      createComponent(DelegatedEventProvider, {
        get children() {
          return createComponent(MockChild, {})
        },
      }),
    )

    expect(providedContext).toBeDefined()
    expect((providedContext as any).delegatedEventMap).toBe(delegatedEventMap)
    expect((providedContext as any).delegatedEventMap).toBeInstanceOf(Map)
    expect((providedContext as any).isFake).toBe(false)
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('DelegatedEventContext should provide fake context by default', async () => {
    const {DelegatedEventContext} = await importSubject({isServer: false})
    const {result} = renderHook(() => useContext(DelegatedEventContext))

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
  })

  it('useDelegatedEmitHandler should emit event inside provider (no warn)', async () => {
    const {DelegatedEventProvider, useDelegatedEmitHandler} = await importSubject({isServer: false})
    const delegatedEventMap = new Map()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe: vi.fn()})

    let emit: ((channel: string, key: string, value: unknown) => void) | undefined = undefined

    const MockChild = () => {
      emit = useDelegatedEmitHandler()

      return null
    }

    render(() =>
      createComponent(DelegatedEventProvider, {
        get children() {
          return createComponent(MockChild, {})
        },
      }),
    )
    emit?.('test-channel', 'test-key', 'test-value')
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('test-channel', 'test-key', 'test-value')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('useDelegatedEmitHandler should warn when provider is missing on client', async () => {
    const {useDelegatedEmitHandler} = await importSubject({isServer: false})

    let emit: ((channel: string, key: string, value: unknown) => void) | undefined = undefined

    render(() => {
      emit = useDelegatedEmitHandler()

      return null
    })
    expect(warnSpy).toHaveBeenCalledWith('DelegatedEventContext is not provided')
    emit?.('c', 'k', 'v')
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('c', 'k', 'v')
  })

  it('useDelegatedEmitHandler should not warn on server', async () => {
    const {useDelegatedEmitHandler} = await importSubject({isServer: true})

    let emit: ((channel: string, key: string, value: unknown) => void) | undefined = undefined

    render(() => {
      emit = useDelegatedEmitHandler()

      return null
    })
    expect(warnSpy).not.toHaveBeenCalled()
    emit?.('c', 'k', 'v')
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('c', 'k', 'v')
  })

  it('useGlobalDelegatedEventMap should return fake map when target is invalid', async () => {
    const {useGlobalDelegatedEventMap} = await importSubject({isServer: false})

    const result = useGlobalDelegatedEventMap(() => null)

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
    expect(mocks.createDelegatedEvent).not.toHaveBeenCalled()
  })

  it('useGlobalDelegatedEventMap should return fake map when target is not an object', async () => {
    const {useGlobalDelegatedEventMap} = await importSubject({isServer: false})

    const result = useGlobalDelegatedEventMap(() => 1)

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
    expect(mocks.createDelegatedEvent).not.toHaveBeenCalled()
  })

  it('useGlobalDelegatedEventMap should cache delegatedEventMap on target', async () => {
    const {useGlobalDelegatedEventMap} = await importSubject({isServer: false})

    const delegatedEventMap = new Map()
    const unsubscribe = vi.fn()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe})

    const targetObject: Record<PropertyKey, unknown> = {}

    const result1 = useGlobalDelegatedEventMap(() => targetObject)
    const result2 = useGlobalDelegatedEventMap(() => targetObject)

    expect(result1.isFake).toBe(false)
    expect(result1.delegatedEventMap).toBe(delegatedEventMap)
    expect(result2.isFake).toBe(false)
    expect(result2.delegatedEventMap).toBe(delegatedEventMap)
    expect(mocks.createDelegatedEvent).toHaveBeenCalledTimes(1)
  })

  it('useGlobalDelegatedEventMap should use getDocument as default target', async () => {
    const {DELEGATED_EVENT_KEYS, useGlobalDelegatedEventMap} = await importSubject({isServer: false})
    const delegatedEventMap = new Map()
    const unsubscribe = vi.fn()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe})

    const result = useGlobalDelegatedEventMap()
    const stored = (document as any)[DELEGATED_EVENT_KEYS] as unknown

    expect(result.isFake).toBe(false)
    expect(result.delegatedEventMap).toBe(delegatedEventMap)
    expect(stored).toBeDefined()
  })

  it('useDelegatedOn should early-return when listener is undefined', async () => {
    const {DelegatedEventProvider, useDelegatedOn} = await importSubject({isServer: false})
    const delegatedEventMap = new Map()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe: vi.fn()})

    const MockChild = () => {
      useDelegatedOn('c', 'k', () => undefined)

      return null
    }

    render(() =>
      createComponent(DelegatedEventProvider, {
        get children() {
          return createComponent(MockChild, {})
        },
      }),
    )
    await Promise.resolve()
    expect(mocks.delegatedOn).not.toHaveBeenCalled()
  })

  it('useDelegatedOn should warn when provider is missing on client', async () => {
    const {useDelegatedOn} = await importSubject({isServer: false})

    render(() => {
      // WARN happens even if listener is undefined, and this avoids triggering delegatedOn in the effect
      useDelegatedOn('c', 'k', () => undefined)

      return null
    })
    expect(warnSpy).toHaveBeenCalledWith('DelegatedEventContext is not provided')
  })

  it('useDelegatedOn should add listener and cleanup on unmount (provider)', async () => {
    const {DelegatedEventProvider, useDelegatedOn} = await importSubject({isServer: false})
    const addListener = vi.fn()
    const removeListener = vi.fn()

    mocks.delegatedOn.mockReturnValue({addListener, removeListener})

    const channel = 'test-channel'
    const key = 'test-key'
    const listener = vi.fn()
    const unsubscribe = vi.fn()
    const delegatedEventMap = new Map()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe})

    const MockChild = () => {
      useDelegatedOn(channel, key, () => listener)

      return null
    }

    const {unmount} = render(() =>
      createComponent(DelegatedEventProvider, {
        get children() {
          return createComponent(MockChild, {})
        },
      }),
    )

    await Promise.resolve()
    expect(mocks.delegatedOn).toHaveBeenCalledWith(delegatedEventMap, channel, key, listener, expect.any(Function))
    expect(addListener).toHaveBeenCalledTimes(1)
    expect(removeListener).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('useDelegatedOn should not call addListener on server but should cleanup', async () => {
    const {useDelegatedOn} = await importSubject({isServer: true})
    const addListener = vi.fn()
    const removeListener = vi.fn()

    mocks.delegatedOn.mockReturnValue({addListener, removeListener})
    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap: new Map(), unsubscribe: vi.fn()})

    const listener = vi.fn()

    const {unmount} = render(() => {
      useDelegatedOn('c', 'k', () => listener, {globalMap: true, target: () => ({})})

      return null
    })

    await Promise.resolve()
    expect(addListener).not.toHaveBeenCalled()
    expect(removeListener).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
  })
})
