/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({setStored: vi.fn(), useEvent: vi.fn(), useStorage: vi.fn()}))

vi.mock('@winter-love/solid-use', () => ({useEvent: mocks.useEvent, useStorage: mocks.useStorage}))

import {useRestoreScroll} from '../index'

describe('useRestoreScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should restore a saved scroll ratio and persist scroll events', () => {
    mocks.useStorage.mockReturnValue([() => 0.25, mocks.setStored])
    const element = document.createElement('div')
    Object.defineProperties(element, {
      clientWidth: {configurable: true, value: 200},
      scrollWidth: {configurable: true, value: 1000},
    })

    renderHook(() => useRestoreScroll(() => element))
    const [, eventName, listener, options] = mocks.useEvent.mock.calls[0]

    expect(element.scrollLeft).toBe(200)
    expect(eventName).toBe('scroll')
    expect(options).toEqual({passive: true})

    element.scrollLeft = 400
    listener({target: element} as unknown as Event)
    expect(mocks.setStored).toHaveBeenCalledWith(0.5)
  })

  it('should center scrolling when the saved ratio is invalid', () => {
    mocks.useStorage.mockReturnValue([() => Number.NaN, mocks.setStored])
    const element = document.createElement('div')
    Object.defineProperties(element, {
      clientWidth: {configurable: true, value: 200},
      scrollWidth: {configurable: true, value: 1000},
    })

    renderHook(() => useRestoreScroll(() => element))

    expect(element.scrollLeft).toBe(400)
  })
})
