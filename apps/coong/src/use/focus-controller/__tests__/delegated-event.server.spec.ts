/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {useDelegatedEmitHandler, useDelegatedOn} from '../DelegatedEvent'

const mocks = vi.hoisted(() => {
  return {
    createDelegatedEvent: vi.fn(),
    delegatedEmit: vi.fn(),
    delegatedOn: vi.fn(),
  }
})

vi.mock('src/utils/focus-controller/delegated-event', () => {
  return {
    createDelegatedEvent: mocks.createDelegatedEvent,
    DEFAULT_CHANNEL_PREFIX: '',
    delegatedEmit: mocks.delegatedEmit,
    delegatedOn: mocks.delegatedOn,
  }
})

vi.mock('solid-js/web', async () => {
  const actual = await vi.importActual<typeof import('solid-js/web')>('solid-js/web')

  return {
    ...actual,
    isServer: true,
  }
})

describe('DelegatedEvent server behavior', () => {
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

  it('useDelegatedEmitHandler should not warn on server', () => {
    render(() => {
      const emit = useDelegatedEmitHandler()

      emit('c', 'k', 'v')

      return null
    })
    expect(warnSpy).not.toHaveBeenCalled()
    expect(mocks.delegatedEmit).toHaveBeenCalledWith('c', 'k', 'v')
  })

  it('useDelegatedOn should not call addListener on server but should cleanup', async () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()

    mocks.delegatedOn.mockReturnValue({addListener, removeListener})
    mocks.createDelegatedEvent.mockReturnValue({
      delegatedEventMap: new Map(),
      unsubscribe: vi.fn(),
    })

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
