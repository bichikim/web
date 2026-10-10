/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {PomodoroTimerState} from '../features/pomodoro-timer/model'
import {
  CONFIG,
  CONFIG_STORAGE_KEY,
  finishInitialization,
  STATE_STORAGE_KEY,
  TestBroadcastChannel,
  autoStartMocks,
} from '../features/pomodoro-timer/__tests__/fixtures/timer'
import {usePomodoroTimer} from '../features/pomodoro-timer/use-pomodoro-timer'

it('should apply a cross-tab pause that happens while reading persisted timer state on mount', async () => {
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)

  const runningState = {
    completedFocusSessions: 0,
    endsAt: 10_000,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  const pausedState = {
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'paused',
  } satisfies PomodoroTimerState

  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  autoStartMocks.read.mockResolvedValue(false)

  const source = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(source)

  let pauseDuringStateRead = () => undefined
  const racingStorage = {
    getItem: (key: string) => {
      const value = localStorage.getItem(key)
      if (key === STATE_STORAGE_KEY && value !== null) {
        pauseDuringStateRead()
      }
      return value
    },
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value)
    },
  }

  const receiver = renderHook(() => usePomodoroTimer({storage: racingStorage}), {
    wrapper: PreferenceProvider,
  })
  pauseDuringStateRead = () => {
    source.result.onPause()
  }

  await finishInitialization(receiver)

  expect(receiver.result.state()).toEqual(pausedState)
  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '')).toEqual(pausedState)

  source.cleanup()
  receiver.cleanup()
})
