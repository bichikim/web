/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {localDateRuntime} from '../local-date-runtime'
import {useLocalDate} from '../use-local-date'

vi.mock('../local-date-runtime', () => ({
  localDateRuntime: {schedule: vi.fn(), subscribe: vi.fn()},
}))

afterEach(() => vi.clearAllMocks())

it('should refresh at the next local midnight and schedule the following midnight', () => {
  let now = new Date(2026, 11, 31, 23, 59, 59)
  vi.mocked(localDateRuntime.schedule).mockReturnValue(vi.fn())
  vi.mocked(localDateRuntime.subscribe).mockReturnValue(vi.fn())
  const {result, cleanup} = renderHook(() => useLocalDate({initialDate: now, now: () => now}))
  expect(result()).toBe('2026-12-31')
  expect(localDateRuntime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)
  now = new Date(2027, 0, 1)
  vi.mocked(localDateRuntime.schedule).mock.calls[0][0]()
  expect(result()).toBe('2027-01-01')
  expect(localDateRuntime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 86_400_000)
  now = new Date(2027, 0, 2)
  vi.mocked(localDateRuntime.schedule).mock.calls[1][0]()
  expect(result()).toBe('2027-01-02')
  cleanup()
})

it('should refresh on visible return and cancel replaced work on disposal', () => {
  let now = new Date(2026, 11, 31, 23, 59, 59)
  const cancel = vi.fn()
  const unsubscribe = vi.fn()
  vi.mocked(localDateRuntime.schedule).mockReturnValue(cancel)
  vi.mocked(localDateRuntime.subscribe).mockReturnValue(unsubscribe)
  const {result, cleanup} = renderHook(() => useLocalDate({initialDate: now, now: () => now}))
  const notifyVisibility = vi.mocked(localDateRuntime.subscribe).mock.calls[0][0]
  now = new Date(2027, 0, 3, 23, 59, 59)
  notifyVisibility(true)
  expect(result()).toBe('2026-12-31')
  notifyVisibility(false)
  expect(result()).toBe('2027-01-03')
  expect(cancel).toHaveBeenCalledOnce()
  expect(localDateRuntime.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)
  cleanup()
  expect(cancel).toHaveBeenCalledTimes(2)
  expect(unsubscribe).toHaveBeenCalledOnce()
})
