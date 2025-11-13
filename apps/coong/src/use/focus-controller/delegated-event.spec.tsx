/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, render, fireEvent} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {
  DelegatedEventContext,
  useDelegatedEmitHandler,
  useDelegatedOn,
  DelegatedEventProvider,
} from './delegated-event'
import {createDelegatedEvent, delegatedEmit, delegatedOn} from 'src/utils/focus-controller/delegated-event'

vi.mock('src/utils/focus-controller/delegated-event', () => ({
  createDelegatedEvent: vi.fn(),
  delegatedEmit: vi.fn(),
  delegatedOn: vi.fn(),
  DEFAULT_CHANNEL_PREFIX: '$$channel__',
}))

describe('DelegatedEventProvider', () => {
  it('should provide context values', () => {
    vi.mocked(createDelegatedEvent).mockReturnValue({
      delegatedEventMap: new Map(),
      unsubscribe: vi.fn(),
    })
    let providedContext: any = undefined
    const MockChild = () => {
      providedContext = useContext(DelegatedEventContext)
      return null
    }
    render(() => <DelegatedEventProvider><MockChild /></DelegatedEventProvider>)

    expect(providedContext).toBeDefined()
    expect(providedContext.delegatedEventMap).toBeInstanceOf(Map)
    expect(typeof providedContext.prefix).toBe('string')
    expect(providedContext.isFake).toBe(false)
  })
  it('should provide fake context', () => {
    const {result} = renderHook(() => useContext(DelegatedEventContext))
    expect(result.isFake).toBe(true)
    expect(result.delegatedEventMap).toBeInstanceOf(Map)
    expect(typeof result.prefix).toBe('string')
  })
})

describe('useDelegatedEmitHandler', () => {
  it('should emit event', () => {
    const prefix = 'test-prefix'
    const channel = 'test-channel'
    const key = 'test-key'
    const value = 'test-value'
    const MockChild = () => {
      const emit = useDelegatedEmitHandler()
      return <button onClick={() => emit(channel, key, value)}>Test</button>
    }
    const {container} = render(() => <DelegatedEventProvider initialEventNamePrefix={prefix}><MockChild /></DelegatedEventProvider>)

    fireEvent.click(container.querySelector('button')!)

    expect(delegatedEmit).toHaveBeenCalledWith(channel, key, value, prefix)
  })
})

describe('useDelegatedOn', () => {
  it('should add listener', () => {
    const addListener = vi.fn()
    const unsubscribe = vi.fn()
    vi.mocked(delegatedOn).mockReturnValue({
      addListener,
      unsubscribe,
    })
    const prefix = 'test-prefix'
    const channel = 'test-channel'
    const key = 'test-key'
    const value = 'test-value'
    const listener = vi.fn()
    const MockChild = () => {
      useDelegatedOn(channel, key, listener)
      return null
    }
    const {unmount} = render(() => <DelegatedEventProvider initialEventNamePrefix={prefix}><MockChild /></DelegatedEventProvider>)
    expect(delegatedOn).toHaveBeenCalledWith(new Map(), channel, key, listener, prefix)
    expect(addListener).toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

})
