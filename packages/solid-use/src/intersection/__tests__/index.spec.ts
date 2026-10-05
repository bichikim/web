/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createRoot, createSignal} from 'solid-js'
import {useIntersection} from '../index'

describe('useIntersection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['remove', 'replace'] as const)(
    'should clear intersection state when the target changes by %s and ignore old notifications',
    (change) => {
      const notifications: IntersectionObserverCallback[] = []
      const disconnect = vi.fn()
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          observe() {}
          disconnect = disconnect
          constructor(callback: IntersectionObserverCallback) {
            notifications.push(callback)
          }
        },
      )
      const first = document.createElement('div')
      const api = createRoot((dispose) => {
        const [target, setTarget] = createSignal<HTMLElement | null>(first)
        return {dispose, setTarget, value: useIntersection(target, {})}
      })
      const bounds = first.getBoundingClientRect()
      const entry: IntersectionObserverEntry = {
        boundingClientRect: bounds,
        intersectionRatio: 1,
        intersectionRect: bounds,
        isIntersecting: true,
        rootBounds: null,
        target: first,
        time: 0,
      }
      const notify = notifications[0]!
      try {
        notify([entry], {} as IntersectionObserver)
        expect(api.value()).toBe(true)
        api.setTarget(change === 'remove' ? null : document.createElement('div'))
        expect(disconnect).toHaveBeenCalledOnce()
        expect(api.value()).toBe(false)
        notify([entry], {} as IntersectionObserver)
        expect(api.value()).toBe(false)
      } finally {
        api.dispose()
      }
    },
  )

  it('should observe the target element and disconnect on cleanup', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()

    class MockIntersectionObserver {
      observe = observe
      disconnect = disconnect

      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    const element = document.createElement('div')

    const {dispose} = createRoot((dispose) => {
      useIntersection(() => element, {threshold: 0.5})

      return {dispose}
    })

    expect(observe).toHaveBeenCalledWith(element)
    dispose()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('should not observe when target is null', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()

    class MockIntersectionObserver {
      observe = observe
      disconnect = disconnect

      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    const {dispose} = createRoot((dispose) => {
      useIntersection(() => null, {threshold: 0.5})

      return {dispose}
    })

    expect(observe).not.toHaveBeenCalled()
    dispose()
    expect(disconnect).not.toHaveBeenCalled()
  })
})
