/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useElementRect} from '../use-element-rect'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('should track moving geometry without resize events and stop when motion ends', () => {
  let frame: FrameRequestCallback = () => undefined
  const request = vi.fn((callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  vi.stubGlobal('ResizeObserver', undefined)
  const element = document.createElement('div')
  const measure = vi
    .spyOn(element, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 10, 240, 100))
  const [moving, setMoving] = createSignal(true)
  const {result, cleanup} = renderHook(() => useElementRect({element: () => element, moving}))
  expect(request).toHaveBeenCalledOnce()
  measure.mockReturnValue(new DOMRect(0, 40, 240, 100))
  frame(0)
  expect(result()?.y).toBe(40)
  expect(request).toHaveBeenCalledTimes(2)
  setMoving(false)
  expect(cancel).toHaveBeenCalledExactlyOnceWith(1)
  cleanup()
  expect(request).toHaveBeenCalledTimes(2)
})
it('should remeasure after layout and resize changes and disconnect its observer', () => {
  let resize = () => undefined
  let frame: FrameRequestCallback = () => undefined
  const request = vi.fn((callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = disconnect
      constructor(callback: ResizeObserverCallback) {
        resize = () => {
          callback([], this)
        }
      }
    },
  )
  const element = document.createElement('div')
  const measure = vi
    .spyOn(element, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(8, 8, 240, 100))
  const [layout, setLayout] = createSignal(0)
  const {result, cleanup} = renderHook(() => useElementRect({element: () => element, layout}))
  expect(result()).toEqual({height: 100, width: 240, x: 8, y: 8})
  measure.mockReturnValue(new DOMRect(8, 120, 240, 100))
  setLayout(1)
  expect(result()?.y).toBe(120)
  measure.mockReturnValue(new DOMRect(8, 120, 240, 80))
  resize()
  resize()
  expect(request).toHaveBeenCalledOnce()
  expect(result()?.height).toBe(100)
  frame(0)
  expect(result()?.height).toBe(80)
  resize()
  cleanup()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(cancel).toHaveBeenCalledExactlyOnceWith(1)
})
