/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'
import {createBrowserDiaryEnvironment} from '../environment'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('should read the browser clock and UUID generator', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-05T00:00:00Z'))
  const id = '00000000-0000-4000-8000-000000000001'
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(id)
  const environment = createBrowserDiaryEnvironment()
  expect(environment.now().toISOString()).toBe('2026-09-05T00:00:00.000Z')
  expect(environment.createId()).toBe(id)
})

it('should report the current viewport, observe changes, and unsubscribe', () => {
  const target = new EventTarget()
  const media = {
    addEventListener: target.addEventListener.bind(target),
    matches: false,
    removeEventListener: target.removeEventListener.bind(target),
  }
  const matchMedia = vi.fn(() => media)
  vi.stubGlobal('matchMedia', matchMedia)
  const onChange = vi.fn()
  const stop = createBrowserDiaryEnvironment().observeCompact(onChange)
  expect(matchMedia).toHaveBeenCalledWith('(width < 48rem)')
  expect(onChange).toHaveBeenLastCalledWith(false)
  media.matches = true
  target.dispatchEvent(new Event('change'))
  expect(onChange).toHaveBeenLastCalledWith(true)
  stop()
  target.dispatchEvent(new Event('change'))
  expect(onChange).toHaveBeenCalledTimes(2)
})

it('should default to wide layout without matchMedia', () => {
  vi.stubGlobal('matchMedia', undefined)
  const onChange = vi.fn()
  const stop = createBrowserDiaryEnvironment().observeCompact(onChange)
  expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
  expect(stop).not.toThrow()
})

it('should support a media query without event subscription methods', () => {
  vi.stubGlobal('matchMedia', () => ({matches: true}))
  const onChange = vi.fn()
  const stop = createBrowserDiaryEnvironment().observeCompact(onChange)
  expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  expect(stop).not.toThrow()
})
