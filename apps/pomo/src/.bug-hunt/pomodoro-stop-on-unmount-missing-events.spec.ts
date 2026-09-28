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

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

interface TimerView {
  readonly result: {
    readonly onConfigChange: (config: PomodoroTimerConfig) => void
    readonly onStart: () => void
    readonly waitForInitialization: () => Promise<void>
  }
}

const finishInitialization = (view: TimerView) => view.result.waitForInitialization()

beforeEach(() => {
  localStorage.clear()
  autoStartMocks.read.mockReset().mockResolvedValue(false)
  autoStartMocks.write.mockReset().mockResolvedValue(undefined)
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

it('should emit focus-end when stopOnUnmount stops a running focus timer on unmount', async () => {
  const onEvents = vi.fn()
  const timer = renderHook(() => usePomodoroTimer({onEvents, stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onConfigChange(CONFIG)
  timer.result.onStart()
  onEvents.mockClear()
  timer.cleanup()
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(['focus-end'])
})
