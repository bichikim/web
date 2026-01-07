/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {fireEvent, render, renderHook} from '@solidjs/testing-library'
import {useContext} from 'solid-js'

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
  vi.doMock('solid-js/web', () => ({isServer: options.isServer}))

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

  it('should provide context values', async () => {
    const {DelegatedEventContext, DelegatedEventProvider} = await importSubject()
    const delegatedEventMap = new Map()

    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe: vi.fn()})
    let providedContext: unknown = undefined

    const MockChild = () => {
      providedContext = useContext(DelegatedEventContext)

      return null
    }

    render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))

    expect(providedContext).toBeDefined()
    expect((providedContext as any).delegatedEventMap).toBe(delegatedEventMap)
    expect((providedContext as any).delegatedEventMap).toBeInstanceOf(Map)
    expect((providedContext as any).isFake).toBe(false)
  })

  it('should provide fake context', async () => {
    const {DelegatedEventContext} = await importSubject()
    const {result} = renderHook(() => useContext(DelegatedEventContext))

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
  })

  it('useDelegatedEmitHandler: should emit event inside provider (no warn)', async () => {
    const {DelegatedEventProvider, useDelegatedEmitHandler} = await importSubject()
    const channel = 'test-channel'
    const key = 'test-key'
    const value = 'test-value'

    const MockChild = () => {
      const emit = useDelegatedEmitHandler()

      return <button onClick={() => emit(channel, key, value)}>Test</button>
    }

    const {container} = render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))

    fireEvent.click(container.querySelector('button')!)
    expect(mocks.delegatedEmit).toHaveBeenCalledWith(channel, key, value)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('useDelegatedEmitHandler: should warn when provider is missing on client', async () => {
    const {useDelegatedEmitHandler} = await importSubject({isServer: false})

    const MockChild = () => {
      const emit = useDelegatedEmitHandler()

      return <button onClick={() => emit('c', 'k', 'v')}>Test</button>
    }

    const {container} = render(() => <MockChild />)

    fireEvent.click(container.querySelector('button')!)
    expect(warnSpy).toHaveBeenCalledWith('DelegatedEventContext is not provided')
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('c', 'k', 'v')
  })

  it('useDelegatedEmitHandler: should not warn on server', async () => {
    const {useDelegatedEmitHandler} = await importSubject({isServer: true})

    const MockChild = () => {
      const emit = useDelegatedEmitHandler()

      return <button onClick={() => emit('c', 'k', 'v')}>Test</button>
    }

    const {container} = render(() => <MockChild />)

    fireEvent.click(container.querySelector('button')!)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('c', 'k', 'v')
  })

  it('useGlobalDelegatedEventMap: should return fake map when target is invalid', async () => {
    const {useGlobalDelegatedEventMap} = await importSubject()

    const result = useGlobalDelegatedEventMap(() => null)

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
    expect(mocks.createDelegatedEvent).not.toHaveBeenCalled()
  })

  it('useGlobalDelegatedEventMap: should cache delegatedEventMap on target', async () => {
    const {useGlobalDelegatedEventMap} = await importSubject()

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

  it('useDelegatedOn: should early-return when listener is undefined', async () => {
    const {DelegatedEventProvider, useDelegatedOn} = await importSubject()
    const delegatedEventMap = new Map()
    mocks.createDelegatedEvent.mockReturnValue({delegatedEventMap, unsubscribe: vi.fn()})

    const MockChild = () => {
      useDelegatedOn('c', 'k', () => undefined)

      return null
    }

    render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))

    await Promise.resolve()
    expect(mocks.delegatedOn).not.toHaveBeenCalled()
  })

  it('useDelegatedOn: should warn when provider is missing on client', async () => {
    const {useDelegatedOn} = await importSubject({isServer: false})

    const listener = vi.fn()
    const MockChild = () => {
      useDelegatedOn('c', 'k', () => listener)

      return null
    }

    render(() => <MockChild />)

    await Promise.resolve()
    expect(warnSpy).toHaveBeenCalledWith('DelegatedEventContext is not provided')
  })

  it('useDelegatedOn: should add listener and cleanup on unmount (provider)', async () => {
    const {DelegatedEventProvider, useDelegatedOn} = await importSubject({isServer: false})
    const addListener = vi.fn()
    const removeListener = vi.fn()

    mocks.delegatedOn.mockReturnValue({
      addListener,
      removeListener,
    })
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

    const {unmount} = render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))

    await Promise.resolve()
    expect(mocks.delegatedOn).toHaveBeenCalledWith(delegatedEventMap, channel, key, listener, expect.any(Function))
    expect(addListener).toHaveBeenCalled()
    expect(removeListener).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('useDelegatedOn: should not call addListener on server but should cleanup', async () => {
    const {useDelegatedOn} = await importSubject({isServer: true})
    const addListener = vi.fn()
    const removeListener = vi.fn()
    mocks.delegatedOn.mockReturnValue({addListener, removeListener})

    const listener = vi.fn()
    const {unmount} = render(() => {
      useDelegatedOn('c', 'k', () => listener, {globalMap: true, target: () => ({})})

      return null
    })

    await Promise.resolve()
    expect(addListener).not.toHaveBeenCalled()
    expect(removeListener).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalled()
  })
})

