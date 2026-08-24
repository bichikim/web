/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {usePomodoroTimer} from '../use-pomodoro-timer'

vi.mock('../auto-start-storage', () => ({
  readAutoStartPreference: vi.fn().mockResolvedValue(false),
  writeAutoStartPreference: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should refresh on visibility changes and stop after owner cleanup', async () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const view = renderHook(usePomodoroTimer)
  await Promise.resolve()

  view.result.onStart()
  const initialRemainingSeconds = view.result.remainingSeconds()
  vi.setSystemTime(1_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(view.result.remainingSeconds()).toBe(initialRemainingSeconds - 1)
  expect(add).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})

  view.cleanup()
  vi.setSystemTime(2_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(view.result.remainingSeconds()).toBe(initialRemainingSeconds - 1)
  expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
})
