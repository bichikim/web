/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useHorizontalScroll} from '../index'

afterEach(() => vi.unstubAllGlobals())

const createViewport = () => {
  const viewport = document.createElement('div')
  const scrollBy = vi.fn()
  Object.defineProperties(viewport, {
    clientWidth: {configurable: true, value: 300},
    scrollBy: {value: scrollBy},
    scrollWidth: {configurable: true, value: 1000},
  })
  return {scrollBy, viewport}
}

it('should expose available directions, tolerate fractional edges, and use the latest page ratio', () => {
  const {viewport, scrollBy} = createViewport()
  const [ratio, setRatio] = createSignal(0.8)
  const {scroll, dispose} = createRoot((dispose) => ({
    dispose,
    scroll: useHorizontalScroll({pageRatio: ratio, viewport: () => viewport}),
  }))

  expect(scroll.canScrollLeft()).toBe(false)
  expect(scroll.canScrollRight()).toBe(true)
  scroll.scrollRight()
  expect(scrollBy).toHaveBeenLastCalledWith({left: 240})
  viewport.scrollLeft = 240
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(true)
  expect(scroll.canScrollRight()).toBe(true)
  setRatio(0.5)
  scroll.scrollLeft()
  expect(scrollBy).toHaveBeenLastCalledWith({left: -150})
  viewport.scrollLeft = 699.5
  scroll.onScroll()
  expect(scroll.canScrollRight()).toBe(false)
  viewport.scrollLeft = -20
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(false)
  Object.defineProperty(viewport, 'scrollWidth', {value: 300})
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(false)
  expect(scroll.canScrollRight()).toBe(false)
  dispose()
})

it('should measure content and resizing, and detach observers when the viewport changes or unmounts', async () => {
  const callbacks: Array<() => void> = []
  const observe = vi.fn()
  const unobserve = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        callbacks.push(callback)
      }
      observe = observe
      unobserve = unobserve
      disconnect = disconnect
    },
  )
  const first = createViewport().viewport
  const second = createViewport().viewport
  const [viewport, setViewport] = createSignal<HTMLElement | null>(first)
  const {scroll, dispose} = createRoot((dispose) => ({
    dispose,
    scroll: useHorizontalScroll({viewport}),
  }))
  const child = document.createElement('div')
  Object.defineProperty(first, 'scrollWidth', {value: 300})
  first.append(child)
  await Promise.resolve()
  expect(scroll.canScrollRight()).toBe(false)
  expect(observe).toHaveBeenCalledWith(child)
  Object.defineProperty(first, 'scrollWidth', {value: 1000})
  callbacks[0]()
  expect(scroll.canScrollRight()).toBe(true)
  child.remove()
  await Promise.resolve()
  expect(unobserve).toHaveBeenCalledWith(child)
  setViewport(second)
  expect(disconnect).toHaveBeenCalledOnce()
  Object.defineProperty(first, 'scrollWidth', {value: 300})
  first.append(document.createElement('div'))
  await Promise.resolve()
  expect(scroll.canScrollRight()).toBe(true)
  dispose()
  expect(disconnect).toHaveBeenCalledTimes(2)
})

it('should interpret negative right-to-left scroll offsets as physical left and right edges', () => {
  const {viewport} = createViewport()
  viewport.style.direction = 'rtl'
  const {scroll, dispose} = createRoot((dispose) => ({
    dispose,
    scroll: useHorizontalScroll({viewport: () => viewport}),
  }))
  expect(scroll.canScrollLeft()).toBe(true)
  expect(scroll.canScrollRight()).toBe(false)
  viewport.scrollLeft = -350
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(true)
  expect(scroll.canScrollRight()).toBe(true)
  viewport.scrollLeft = -700
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(false)
  expect(scroll.canScrollRight()).toBe(true)
  dispose()
})

it('should remain idle without a viewport and support scroll events without observer APIs', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  vi.stubGlobal('MutationObserver', undefined)
  const [viewport, setViewport] = createSignal<HTMLElement | null>(null)
  const {scroll, dispose} = createRoot((dispose) => ({
    dispose,
    scroll: useHorizontalScroll({viewport}),
  }))
  expect(scroll.canScrollLeft()).toBe(false)
  expect(scroll.canScrollRight()).toBe(false)
  scroll.scrollLeft()
  scroll.scrollRight()
  scroll.onScroll()
  const element = createViewport().viewport
  setViewport(element)
  expect(scroll.canScrollRight()).toBe(true)
  element.scrollLeft = 700
  scroll.onScroll()
  expect(scroll.canScrollLeft()).toBe(true)
  expect(scroll.canScrollRight()).toBe(false)
  setViewport(null)
  expect(scroll.canScrollLeft()).toBe(false)
  expect(scroll.canScrollRight()).toBe(false)
  dispose()
})

it('should reject a nonpositive or nonfinite page ratio when scrolling', () => {
  const {viewport} = createViewport()
  const [ratio, setRatio] = createSignal(0)
  const {scroll, dispose} = createRoot((dispose) => ({
    dispose,
    scroll: useHorizontalScroll({pageRatio: ratio, viewport: () => viewport}),
  }))
  expect(scroll.scrollRight).toThrow(RangeError)
  setRatio(Number.NaN)
  expect(scroll.scrollLeft).toThrow(RangeError)
  dispose()
})
