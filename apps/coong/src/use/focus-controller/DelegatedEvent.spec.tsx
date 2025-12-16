/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {renderHook, render, fireEvent} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {DelegatedEventContext, useDelegatedEmitHandler, useDelegatedOn, DelegatedEventProvider} from './DelegatedEvent'
import {createDelegatedEvent, delegatedEmit, delegatedOn} from 'src/utils/focus-controller/delegated-event'

vi.mock('src/utils/focus-controller/delegated-event', () => ({
  DEFAULT_CHANNEL_PREFIX: '$$channel__',
  createDelegatedEvent: vi.fn(),
  delegatedEmit: vi.fn(),
  delegatedOn: vi.fn(),
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

    render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))
    expect(providedContext).toBeDefined()
    expect(providedContext.delegatedEventMap).toBeInstanceOf(Map)
    expect(providedContext.isFake).toBe(false)
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

    vi.mocked(createDelegatedEvent).mockReturnValue({
      delegatedEventMap: new Map(),
      unsubscribe: vi.fn(),
    })

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
  it('should add listener', () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()

    vi.mocked(delegatedOn).mockReturnValue({
      addListener,
      removeListener,
    })
    const channel = 'test-channel'
    const key = 'test-key'
    const listener = vi.fn()

    vi.mocked(createDelegatedEvent).mockReturnValue({
      delegatedEventMap: new Map(),
      unsubscribe: vi.fn(),
    })

    const MockChild = () => {
      useDelegatedOn(channel, key, () => listener)

      return null
    }

    const {unmount} = render(() => (
      <DelegatedEventProvider>
        <MockChild />
      </DelegatedEventProvider>
    ))

    expect(delegatedOn).toHaveBeenCalledWith(expect.any(Map), channel, key, listener, expect.any(Function))
    expect(addListener).toHaveBeenCalled()
    expect(removeListener).not.toHaveBeenCalled()
    unmount()
    expect(removeListener).toHaveBeenCalled()
  })
})
