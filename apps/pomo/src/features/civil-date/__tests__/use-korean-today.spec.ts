/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useKoreanToday} from '../use-korean-today'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should update at Korean midnight and schedule the following midnight', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-13T14:59:59.000Z'))
  const view = renderHook(useKoreanToday)
  expect(view.result()).toBe('2026-09-13')
  vi.advanceTimersByTime(1000)
  expect(view.result()).toBe('2026-09-14')
  vi.advanceTimersByTime(86_400_000)
  expect(view.result()).toBe('2026-09-15')
  view.cleanup()
})

it('should refresh on return and cancel its timer and listener on unmount', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-13T00:00:00.000Z'))
  const view = renderHook(useKoreanToday)
  const timers = vi.getTimerCount()
  vi.setSystemTime(new Date('2026-09-15T14:59:59.000Z'))
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(view.result()).toBe('2026-09-13')
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(view.result()).toBe('2026-09-15')
  expect(vi.getTimerCount()).toBe(timers)
  vi.advanceTimersByTime(1000)
  expect(view.result()).toBe('2026-09-16')
  view.cleanup()
  const remaining = vi.getTimerCount()
  document.dispatchEvent(new Event('visibilitychange'))
  expect(vi.getTimerCount()).toBe(remaining)
  expect(remaining).toBeLessThan(timers)
})
