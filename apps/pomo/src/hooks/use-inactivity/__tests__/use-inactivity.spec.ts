/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal, onMount} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'
import {useInactivity} from '..'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: vi.fn()}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(getMonotonicTime).mockImplementation(() => Date.now())
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'visibilityState')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useInactivity', () => {
  it('should start active and become inactive only after the full initial deadline', () => {
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(999)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
  })

  it.each(['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'])(
    'should restart the deadline on %s activity and wake an inactive consumer',
    (eventName) => {
      const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
      result.start()
      vi.advanceTimersByTime(900)
      globalThis.dispatchEvent(new Event(eventName))
      vi.advanceTimersByTime(999)
      expect(result.inactive()).toBe(false)
      vi.advanceTimersByTime(1)
      expect(result.inactive()).toBe(true)
      globalThis.dispatchEvent(new Event(eventName))
      expect(result.inactive()).toBe(false)
    },
  )

  it('should record an explicit reset and restart the complete deadline', () => {
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    vi.advanceTimersByTime(900)
    result.reset()
    vi.advanceTimersByTime(999)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
  })

  it('should remain stopped after mount, input, reset, visibility and timeout changes', () => {
    const [timeoutMs, setTimeoutMs] = createSignal(1000)
    const {result} = renderHook(() => useInactivity({timeoutMs}))
    expect(vi.getTimerCount()).toBe(0)
    globalThis.dispatchEvent(new Event('pointerdown'))
    expect(vi.getTimerCount()).toBe(0)
    result.reset()
    document.dispatchEvent(new Event('visibilitychange'))
    setTimeoutMs(2000)
    vi.advanceTimersByTime(5000)
    expect(result.inactive()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should start from a later event without losing owner cleanup', () => {
    const view = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    const button = document.createElement('button')
    button.addEventListener('click', view.result.start)
    button.click()
    vi.advanceTimersByTime(999)
    expect(view.result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(view.result.inactive()).toBe(true)
    view.result.reset()
    view.cleanup()
    button.click()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should support caller-owned onMount start', () => {
    const {result} = renderHook(() => {
      const inactivity = useInactivity({timeoutMs: () => 1000})
      onMount(inactivity.start)
      return inactivity
    })
    vi.advanceTimersByTime(1000)
    expect(result.inactive()).toBe(true)
  })

  it('should keep repeated start idempotent before and after expiry', () => {
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    vi.advanceTimersByTime(900)
    result.start()
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(100)
    expect(result.inactive()).toBe(true)
    result.start()
    expect(result.inactive()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    globalThis.dispatchEvent(new Event('pointerdown'))
    expect(result.inactive()).toBe(false)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('should stop, wake, and stay stopped across input, visibility and settings changes', () => {
    const [timeoutMs, setTimeoutMs] = createSignal(1000)
    const [capture, setCapture] = createSignal(false)
    const [activityThrottleMs, setThrottle] = createSignal(500)
    const {result} = renderHook(() => useInactivity({activityThrottleMs, capture, timeoutMs}))
    result.start()
    vi.advanceTimersByTime(1000)
    expect(result.inactive()).toBe(true)
    result.stop()
    result.stop()
    result.reset()
    globalThis.dispatchEvent(new Event('pointermove'))
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    setTimeoutMs(2000)
    setCapture(true)
    setThrottle(0)
    vi.advanceTimersByTime(5000)
    expect(result.inactive()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    result.start()
    vi.advanceTimersByTime(2000)
    expect(result.inactive()).toBe(true)
  })

  it('should cancel a pending deadline on stop and start a new full wait', () => {
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    vi.advanceTimersByTime(900)
    result.stop()
    expect(vi.getTimerCount()).toBe(0)
    result.start()
    vi.advanceTimersByTime(999)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
  })

  it('should rearm with the current timeout only while running, including after expiry', () => {
    const [timeoutMs, setTimeoutMs] = createSignal(1000)
    const {result} = renderHook(() => useInactivity({timeoutMs}))
    result.start()
    vi.advanceTimersByTime(900)
    setTimeoutMs(2000)
    vi.advanceTimersByTime(1999)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
    setTimeoutMs(500)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(500)
    expect(result.inactive()).toBe(true)
  })

  it('should reevaluate a blocker at expiry without tracking its reactive reads', () => {
    const [blocked, setBlocked] = createSignal(false)
    const {result} = renderHook(() => useInactivity({isBlocked: blocked, timeoutMs: () => 1000}))
    result.start()
    vi.advanceTimersByTime(900)
    setBlocked(true)
    vi.advanceTimersByTime(100)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(900)
    setBlocked(false)
    vi.advanceTimersByTime(100)
    expect(result.inactive()).toBe(true)
  })

  it('should suspend while hidden and restart a full deadline when visible', () => {
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    expect(vi.getTimerCount()).toBe(0)
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(1000)
    expect(result.inactive()).toBe(true)
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
    document.dispatchEvent(new Event('visibilitychange'))
    expect(result.inactive()).toBe(false)
    globalThis.dispatchEvent(new Event('pointerdown'))
    expect(vi.getTimerCount()).toBe(0)
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(999)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
  })

  it('should throttle activity resets without throttling wakeup or visibility changes', () => {
    const {result} = renderHook(() =>
      useInactivity({activityThrottleMs: () => 500, timeoutMs: () => 100}),
    )
    result.start()
    result.reset()
    vi.advanceTimersByTime(50)
    globalThis.dispatchEvent(new Event('pointermove'))
    vi.advanceTimersByTime(50)
    expect(result.inactive()).toBe(true)
    result.reset()
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(50)
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(99)
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(result.inactive()).toBe(true)
  })

  it.each([true, false])('should honor capture=%s when a child stops propagation', (capture) => {
    const {result} = renderHook(() =>
      useInactivity({capture: () => capture, timeoutMs: () => 1000}),
    )
    result.start()
    const child = document.createElement('button')
    child.addEventListener('pointerdown', (event) => event.stopPropagation())
    document.body.append(child)
    try {
      vi.advanceTimersByTime(1000)
      child.dispatchEvent(new Event('pointerdown', {bubbles: true}))
      expect(result.inactive()).toBe(!capture)
    } finally {
      child.remove()
    }
  })

  it('should dispose its deadline and all event listeners without allowing later resets', () => {
    const windowRemoval = vi.spyOn(globalThis.window, 'removeEventListener')
    const documentRemoval = vi.spyOn(document, 'removeEventListener')
    const view = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    view.result.start()
    vi.advanceTimersByTime(1000)
    view.cleanup()
    for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll']) {
      expect(windowRemoval).toHaveBeenCalledWith(event, expect.any(Function), {
        capture: false,
        passive: true,
      })
    }
    expect(documentRemoval).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
    globalThis.dispatchEvent(new Event('pointerdown'))
    document.dispatchEvent(new Event('visibilitychange'))
    view.result.start()
    view.result.stop()
    view.result.reset()
    view.result.wake()
    expect(view.result.inactive()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should replace activity listeners when capture changes without resetting the deadline', () => {
    const [capture, setCapture] = createSignal(false)
    const {result} = renderHook(() => useInactivity({capture, timeoutMs: () => 1000}))
    result.start()
    const child = document.createElement('button')
    child.addEventListener('pointerdown', (event) => event.stopPropagation())
    document.body.append(child)

    try {
      vi.advanceTimersByTime(900)
      setCapture(true)
      vi.advanceTimersByTime(100)
      expect(result.inactive()).toBe(true)
      child.dispatchEvent(new Event('pointerdown', {bubbles: true}))
      expect(result.inactive()).toBe(false)
      setCapture(false)
      vi.advanceTimersByTime(1000)
      child.dispatchEvent(new Event('pointerdown', {bubbles: true}))
      expect(result.inactive()).toBe(true)
    } finally {
      child.remove()
    }
  })

  it('should cancel a pending deadline on disposal', () => {
    const view = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    view.result.start()
    vi.advanceTimersByTime(900)
    view.cleanup()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(view.result.inactive()).toBe(false)
  })

  it('should wake without restarting a pending or expired deadline', () => {
    const {result} = renderHook(() => useInactivity({timeoutMs: () => 1000}))
    result.start()
    vi.advanceTimersByTime(900)
    result.wake()
    vi.advanceTimersByTime(100)
    expect(result.inactive()).toBe(true)
    result.wake()
    expect(result.inactive()).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(result.inactive()).toBe(false)
    result.reset()
    vi.advanceTimersByTime(1000)
    expect(result.inactive()).toBe(true)
  })
})
