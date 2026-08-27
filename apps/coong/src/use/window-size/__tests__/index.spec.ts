/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({resolveAccessor: vi.fn(), useEvent: vi.fn()}))

vi.mock('@winter-love/solid-use', () => ({
  resolveAccessor: mocks.resolveAccessor,
  useEvent: mocks.useEvent,
}))

import {useWindowSize} from '../index'

describe('useWindowSize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveAccessor.mockImplementation((value: boolean | (() => boolean) | undefined) =>
      typeof value === 'function' ? value : () => value,
    )
  })

  it('should update the viewport size from resize events while active', () => {
    Object.defineProperties(window, {
      innerHeight: {configurable: true, value: 700},
      innerWidth: {configurable: true, value: 1000},
    })
    const {result} = renderHook(() => useWindowSize({height: 1, width: 1}, true))
    const [target, eventName, listener] = mocks.useEvent.mock.calls[0]

    expect(result()).toEqual({height: 700, width: 1000})
    expect(target()).toBe(window)
    expect(eventName).toBe('resize')

    listener({target: {innerHeight: 800, innerWidth: 1200}} as unknown as Event)
    expect(result()).toEqual({height: 800, width: 1200})
  })

  it('should disable the resize target while inactive', () => {
    renderHook(() => useWindowSize({height: 1, width: 1}, false))
    const [target] = mocks.useEvent.mock.calls[0]

    expect(target()).toBeNull()
  })
})
