/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'
import {createBrowserTurnEnvironment} from '../turn-environment'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createSurface = (width = 800, height = 500) => {
  const surface = document.createElement('div')
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
    bottom: 24 + height,
    height,
    left: 12,
    right: 12 + width,
    toJSON: () => ({}),
    top: 24,
    width,
    x: 12,
    y: 24,
  })
  return surface
}

it('should read live geometry and use half-width pages only on wide screens', () => {
  let compact = false
  const matchMedia = vi.fn(() => ({matches: compact}))
  vi.stubGlobal('matchMedia', matchMedia)
  const surface = createSurface()
  const environment = createBrowserTurnEnvironment({surface: () => surface})
  expect(environment.getMetrics()).toEqual({
    compact: false,
    height: 500,
    left: 12,
    pageWidth: 400,
    top: 24,
  })
  compact = true
  expect(environment.getMetrics()).toEqual({
    compact: true,
    height: 500,
    left: 12,
    pageWidth: 800,
    top: 24,
  })
  expect(matchMedia).toHaveBeenCalledWith('(width < 48rem)')
})

it('should return no geometry when its surface is unavailable', () => {
  expect(createBrowserTurnEnvironment({}).getMetrics()).toBeNull()
  expect(createBrowserTurnEnvironment({surface: () => undefined}).getMetrics()).toBeNull()
})

it.each([
  [0, 500],
  [800, 0],
  [-1, 500],
  [800, -1],
])('should reject dimensions %s by %s', (width, height) => {
  const surface = createSurface(width, height)
  expect(createBrowserTurnEnvironment({surface: () => surface}).getMetrics()).toBeNull()
})

it('should default to wide geometry and unrestricted motion without matchMedia', () => {
  vi.stubGlobal('matchMedia', undefined)
  const surface = createSurface()
  const environment = createBrowserTurnEnvironment({surface: () => surface})
  expect(environment.getMetrics()?.compact).toBe(false)
  expect(environment.getMetrics()?.pageWidth).toBe(400)
  expect(environment.prefersReducedMotion()).toBe(false)
})

it('should read the current reduced-motion preference', () => {
  let reduced = false
  const matchMedia = vi.fn(() => ({matches: reduced}))
  vi.stubGlobal('matchMedia', matchMedia)
  const environment = createBrowserTurnEnvironment({})
  expect(environment.prefersReducedMotion()).toBe(false)
  reduced = true
  expect(environment.prefersReducedMotion()).toBe(true)
  expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
})

it('should delegate the monotonic clock and frame scheduling to the browser', () => {
  vi.spyOn(performance, 'now').mockReturnValue(123)
  const request = vi.fn(() => 42)
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  const environment = createBrowserTurnEnvironment({})
  const callback = vi.fn()
  expect(environment.now()).toBe(123)
  expect(environment.requestFrame(callback)).toBe(42)
  expect(request).toHaveBeenCalledWith(callback)
  environment.cancelFrame(42)
  expect(cancel).toHaveBeenCalledWith(42)
})

it('should forward pointer events with cancellation support and detach all listeners', () => {
  const handlers = {
    cancel: vi.fn(),
    move: vi.fn((event: PointerEvent) => event.preventDefault()),
    up: vi.fn(),
  }
  const stop = createBrowserTurnEnvironment({}).listenPointers(handlers)
  const move = new Event('pointermove', {cancelable: true})
  window.dispatchEvent(move)
  window.dispatchEvent(new Event('pointerup'))
  window.dispatchEvent(new Event('pointercancel'))
  expect(move.defaultPrevented).toBe(true)
  expect(handlers.move).toHaveBeenCalledWith(move)
  expect(handlers.up).toHaveBeenCalledOnce()
  expect(handlers.cancel).toHaveBeenCalledOnce()
  stop()
  window.dispatchEvent(new Event('pointermove'))
  window.dispatchEvent(new Event('pointerup'))
  window.dispatchEvent(new Event('pointercancel'))
  expect(handlers.move).toHaveBeenCalledOnce()
  expect(handlers.up).toHaveBeenCalledOnce()
  expect(handlers.cancel).toHaveBeenCalledOnce()
})
