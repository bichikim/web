/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig, PomodoroTimerState} from '../features/pomodoro-timer/model'
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

const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })

  return {promise, resolve}
}

interface TimerView {
  readonly result: {
    readonly waitForInitialization: () => Promise<void>
    readonly onPause: () => void
    readonly onStart: () => void
    readonly isAutoStartEnabled: () => boolean
    readonly state: () => PomodoroTimerState
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
  vi.restoreAllMocks()
})

it('should deliver deferred focus-end when onStart follows pause on expired restore while loading', async () => {
  const preference = createDeferred<boolean>()
  const onEvents = vi.fn()
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  autoStartMocks.read.mockReturnValue(preference.promise)
  vi.setSystemTime(40_000)

  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  view.result.onPause()
  view.result.onStart()

  preference.resolve(true)
  await finishInitialization(view)

  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(onEvents).toHaveBeenCalledWith(['focus-end', 'break-start'], {isCatchUp: true})
  view.cleanup()
})
