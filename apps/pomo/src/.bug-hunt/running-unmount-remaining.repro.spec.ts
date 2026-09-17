/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig} from '../features/pomodoro-timer/model'
import {usePomodoroTimer} from '../features/pomodoro-timer/use-pomodoro-timer'

const autoStartMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<boolean>>(),
  write: vi.fn<(isEnabled: boolean) => Promise<void>>(),
}))

vi.mock('../features/pomodoro-timer/auto-start-storage', () => ({
  readAutoStartPreference: autoStartMocks.read,
  writeAutoStartPreference: autoStartMocks.write,
}))

const STATE_STORAGE_KEY = 'pomo:timer:v1'
const CONFIG_STORAGE_KEY = 'pomo:timer-config:v1'
const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

const finishMount = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
  autoStartMocks.read.mockReset().mockResolvedValue(false)
  autoStartMocks.write.mockReset().mockResolvedValue(undefined)
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should preserve running mid-phase remaining seconds when stopOnUnmount is enabled', async () => {
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}))
  await finishMount()
  timer.result.onConfigChange(CONFIG)
  timer.result.onStart()
  vi.setSystemTime(5_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(timer.result.remainingSeconds()).toBe(5)

  timer.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 5,
    status: 'idle',
  })
})
