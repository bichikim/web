/** @vitest-environment jsdom */
import {PreferenceProvider} from 'src/hooks/use-preference'
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

const finishInitialization = (view: {result: {waitForInitialization: () => Promise<void>}}) =>
  view.result.waitForInitialization()

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

it('should restore an expired focus phase preserved on unmount instead of falling back to defaults', async () => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(
    STATE_STORAGE_KEY,
    JSON.stringify({
      completedFocusSessions: 0,
      endsAt: 10_000,
      phase: 'focus',
      status: 'running',
    }),
  )

  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  vi.setSystemTime(11_000)
  timer.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toMatchObject({
    remainingSeconds: 0,
    status: 'idle',
  })

  const restored = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await finishInitialization(restored)

  expect(restored.result.state()).toMatchObject({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 0,
    status: 'idle',
  })

  restored.cleanup()
})
