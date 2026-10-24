/**
 * @vitest-environment jsdom
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createEffect, createRoot, createSignal} from 'solid-js'
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

  it('should deliver initial and repeated false entries in order before publishing state', () => {
    let notify!: IntersectionObserverCallback
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const element = document.createElement('div')
    const bounds = element.getBoundingClientRect()
    const makeEntry = (isIntersecting: boolean, time: number): IntersectionObserverEntry => ({
      boundingClientRect: bounds,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: bounds,
      isIntersecting,
      rootBounds: null,
      target: element,
      time,
    })
    const delivered: Array<{time: number; previous: boolean}> = []
    const api = createRoot((dispose) => {
      const [label, setLabel] = createSignal('first')
      const labels: string[] = []
      const value = useIntersection(element, {}, (entry) => {
        labels.push(label())
        delivered.push({previous: value(), time: entry.time})
      })
      return {dispose, labels, setLabel, value}
    })
    try {
      expect(api.value()).toBe(false)
      expect(delivered).toEqual([])
      notify(
        [makeEntry(false, 0), makeEntry(false, 1), makeEntry(true, 2), makeEntry(false, 3)],
        {} as IntersectionObserver,
      )
      expect(delivered).toEqual([
        {previous: false, time: 0},
        {previous: false, time: 1},
        {previous: false, time: 2},
        {previous: true, time: 3},
      ])
      expect(api.value()).toBe(false)
      api.setLabel('latest')
      notify([makeEntry(true, 4)], {} as IntersectionObserver)
      expect(api.labels).toEqual(['first', 'first', 'first', 'first', 'latest'])
    } finally {
      api.dispose()
    }
  })

  it.each(['dispose', 'target', 'options'] as const)(
    'should stop the current delivery when the entry callback changes %s',
    (change) => {
      const notifications: IntersectionObserverCallback[] = []
      const observed: HTMLElement[] = []
      const configurations: IntersectionObserverInit[] = []
      const disconnect = vi.fn()
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
            notifications.push(callback)
            configurations.push(options)
          }
          observe(element: HTMLElement) {
            observed.push(element)
          }
          disconnect = disconnect
        },
      )
      const first = document.createElement('div')
      const second = document.createElement('div')
      const callback = vi.fn()
      const api = createRoot((dispose) => {
        const [target, setTarget] = createSignal(first)
        const [options, setOptions] = createSignal<IntersectionObserverInit>({rootMargin: '80px'})
        const value = useIntersection(target, options, (entry) => {
          callback(entry)
          if (callback.mock.calls.length !== 1) {
            return
          }
          if (change === 'dispose') {
            dispose()
          } else if (change === 'target') {
            setTarget(second)
          } else {
            setOptions({threshold: 0.5})
          }
        })
        return {dispose, value}
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
        notify([entry, entry], {} as IntersectionObserver)
        expect(callback).toHaveBeenCalledOnce()
        expect(api.value()).toBe(false)
        expect(disconnect).toHaveBeenCalledOnce()
        notify([entry], {} as IntersectionObserver)
        expect(callback).toHaveBeenCalledOnce()
        if (change !== 'dispose') {
          expect(observed).toEqual([first, change === 'target' ? second : first])
          expect(configurations[1]).toEqual(
            change === 'options' ? {threshold: 0.5} : {rootMargin: '80px'},
          )
          notifications[1]!(
            [{...entry, target: change === 'target' ? second : first}],
            {} as IntersectionObserver,
          )
          expect(callback).toHaveBeenCalledTimes(2)
          expect(api.value()).toBe(true)
        }
      } finally {
        api.dispose()
      }
    },
  )

  it('should ignore notifications after a published state disposes the owner', () => {
    let notify!: IntersectionObserverCallback
    const callback = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(notification: IntersectionObserverCallback) {
          notify = notification
        }
        observe() {}
        disconnect = disconnect
      },
    )
    const element = document.createElement('div')
    const api = createRoot((dispose) => {
      const value = useIntersection(element, {}, callback)
      createEffect(() => {
        if (value()) {
          dispose()
        }
      })
      return {dispose, value}
    })
    const bounds = element.getBoundingClientRect()
    const entry: IntersectionObserverEntry = {
      boundingClientRect: bounds,
      intersectionRatio: 1,
      intersectionRect: bounds,
      isIntersecting: true,
      rootBounds: null,
      target: element,
      time: 0,
    }
    try {
      notify([entry, {...entry, isIntersecting: false}], {} as IntersectionObserver)
      expect(callback).toHaveBeenCalledOnce()
      expect(api.value()).toBe(true)
      expect(disconnect).toHaveBeenCalledOnce()
      notify([entry], {} as IntersectionObserver)
      expect(callback).toHaveBeenCalledOnce()
    } finally {
      api.dispose()
    }
  })

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
