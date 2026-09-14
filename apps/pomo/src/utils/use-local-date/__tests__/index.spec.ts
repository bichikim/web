/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {dateEnvironment} from '../environment'
import {useLocalDate} from '../index'

vi.mock('../environment', () => ({
  dateEnvironment: {schedule: vi.fn(), subscribe: vi.fn()},
}))

afterEach(() => vi.clearAllMocks())

it('should refresh at the next local midnight and cancel replaced work on visibility and disposal', () => {
  let now = new Date(2026, 11, 31, 23, 59, 59)
  const cancel = vi.fn()
  const unsubscribe = vi.fn()
  vi.mocked(dateEnvironment.schedule).mockReturnValue(cancel)
  vi.mocked(dateEnvironment.subscribe).mockReturnValue(unsubscribe)
  const {result, cleanup} = renderHook(() => useLocalDate({initialDate: now, now: () => now}))
  expect(result()).toBe('2026-12-31')
  expect(dateEnvironment.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)

  now = new Date(2027, 0, 1)
  vi.mocked(dateEnvironment.schedule).mock.calls[0][0]()
  expect(result()).toBe('2027-01-01')
  expect(cancel).toHaveBeenCalledOnce()
  expect(dateEnvironment.schedule).toHaveBeenLastCalledWith(expect.any(Function), 86_400_000)

  now = new Date(2027, 0, 3, 23, 59, 59)
  vi.mocked(dateEnvironment.subscribe).mock.calls[0][0]()
  expect(result()).toBe('2027-01-03')
  expect(cancel).toHaveBeenCalledTimes(2)
  expect(dateEnvironment.schedule).toHaveBeenLastCalledWith(expect.any(Function), 1000)
  cleanup()
  expect(cancel).toHaveBeenCalledTimes(3)
  expect(unsubscribe).toHaveBeenCalledOnce()
})
