/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {useIntersection} from './'

describe('useIntersection', () => {
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
