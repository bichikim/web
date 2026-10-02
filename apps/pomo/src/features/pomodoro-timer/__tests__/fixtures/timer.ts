import {createTestBroadcastChannel} from 'src/test-utils/create-test-broadcast-channel'
/** @vitest-environment jsdom */

import {afterEach, beforeEach, vi} from 'vitest'

import type {PomodoroTimerConfig} from '../../model'

const autoStartMocksHoisted = vi.hoisted(() => ({
  read: vi.fn<() => Promise<boolean>>(),
  write: vi.fn<(isEnabled: boolean) => Promise<void>>(),
}))

vi.mock('../../auto-start-storage', () => ({
  readAutoStartPreference: autoStartMocksHoisted.read,
  writeAutoStartPreference: autoStartMocksHoisted.write,
}))

export const STATE_STORAGE_KEY = 'pomo:timer:v1'
export const CONFIG_STORAGE_KEY = 'pomo:timer-config:v1'
export const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

interface TimerView {
  readonly result: {
    readonly waitForInitialization: () => Promise<void>
  }
}

export const TestBroadcastChannel = createTestBroadcastChannel({
  broadcast: true,
  removeOnClose: true,
})

export const finishInitialization = async (view: TimerView) => {
  await view.result.waitForInitialization()
}

beforeEach(() => {
  localStorage.clear()
  autoStartMocksHoisted.read.mockReset().mockResolvedValue(false)
  autoStartMocksHoisted.write.mockReset().mockResolvedValue(undefined)
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  TestBroadcastChannel.instances = []
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

export const autoStartMocks = autoStartMocksHoisted
