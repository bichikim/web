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
    readonly state: () => {status: string; endsAt?: number | null}
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

it('should stop a cross-tab running timer when the hidden pomodoro unmounts with stopOnUnmount', async () => {
  const source = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  const receiver = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await Promise.all([finishInitialization(source), finishInitialization(receiver)])

  source.result.onConfigChange(CONFIG)
  source.result.onStart()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toMatchObject({
      endsAt: 10_000,
      status: 'running',
    })
  })

  source.cleanup()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toMatchObject({status: 'idle'})
  })

  receiver.cleanup()
})
