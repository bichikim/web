/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render, renderHook} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {DelegatedEventContext, useDelegatedEmitHandler, useDelegatedOn, DelegatedEventProvider} from './DelegatedEvent'
import {createDelegatedEvent, delegatedEmit, delegatedOn} from 'src/utils/focus-controller/delegated-event'

vi.mock('src/utils/focus-controller/delegated-event', () => ({
  DEFAULT_CHANNEL_PREFIX: '',
  createDelegatedEvent: vi.fn(),
  delegatedEmit: vi.fn(),
  delegatedOn: vi.fn(),
}))

describe('DelegatedEventProvider', () => {
  it('should provide context values', () => {
    const delegatedEventMap = new Map()

    vi.mocked(createDelegatedEvent).mockReturnValue({delegatedEventMap, unsubscribe: vi.fn()})
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

  it('should provide fake context', () => {
    const {result} = renderHook(() => useContext(DelegatedEventContext))

    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
  })
})

describe('useDelegatedEmitHandler', () => {
  it('should emit event', () => {
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
    expect(delegatedEmit).toHaveBeenCalledWith(channel, key, value)
  })
})

describe('useDelegatedOn', () => {
  it('should add listener and cleanup on unmount', async () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()

    vi.mocked(delegatedOn).mockReturnValue({
      addListener,
      removeListener,
    })
    const channel = 'test-channel'
    const key = 'test-key'
    const listener = vi.fn()
    const unsubscribe = vi.fn()
    const delegatedEventMap = new Map()

    vi.mocked(createDelegatedEvent).mockReturnValue({delegatedEventMap, unsubscribe})

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
    expect(delegatedOn).toHaveBeenCalledWith(delegatedEventMap, channel, key, listener, expect.any(Function))
    expect(addListener).toHaveBeenCalled()
    expect(removeListener).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
