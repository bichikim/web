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
const TIMER_SYNC_CHANNEL = 'pomo:pomodoro-timer:v1'
const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []

  readonly onmessage: ((event: MessageEvent<unknown>) => void) | null = null

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  postMessage = vi.fn((data: unknown) => {
    for (const channel of TestBroadcastChannel.instances) {
      if (channel !== this && channel.name === this.name) {
        channel.onmessage?.({data} as MessageEvent<unknown>)
      }
    }
  })

  close = vi.fn()
}

const finishInitialization = async (view: {
  readonly result: {readonly waitForInitialization: () => Promise<void>}
}) => {
  await view.result.waitForInitialization()
}

beforeEach(() => {
  localStorage.clear()
  TestBroadcastChannel.instances = []
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  autoStartMocks.read.mockReset().mockResolvedValue(false)
  autoStartMocks.write.mockReset().mockResolvedValue(undefined)
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Incoming BroadcastChannel snapshots apply state without synchronizePomodoroTimer.
 * An expired running timer from another tab is persisted to localStorage before the
 * next animation frame can catch up, so a reload restores an already-expired timer.
 */
it('should synchronize an expired running timer received from another tab before persisting', async () => {
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

  const view = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  const [receiver] = TestBroadcastChannel.instances
  const expiredRunningFocus = {
    completedFocusSessions: 0,
    config: CONFIG,
    isAutoStartEnabled: false,
    state: {
      completedFocusSessions: 0,
      endsAt: 5_000,
      phase: 'focus',
      status: 'running',
    } satisfies PomodoroTimerState,
  }

  vi.setSystemTime(12_000)
  receiver?.onmessage?.({data: expiredRunningFocus} as MessageEvent<unknown>)

  const persisted = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')

  expect(persisted).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  expect(view.result.state()).toEqual(persisted)

  view.cleanup()
})
