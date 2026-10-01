/** @vitest-environment jsdom */
import {
  autoStartMocks,
  CONFIG,
  CONFIG_STORAGE_KEY,
  finishInitialization,
  STATE_STORAGE_KEY,
  TestBroadcastChannel,
} from './fixtures/timer'
import {createDeferred} from 'src/test-utils/create-deferred'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PomodoroTimerState} from '../model'
import {usePomodoroTimer} from '../use-pomodoro-timer'

it('should synchronize timer actions between mounted controllers', async () => {
  const first = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  const second = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await Promise.all([finishInitialization(first), finishInitialization(second)])

  first.result.onConfigChange(CONFIG)
  first.result.onStart()

  await vi.waitFor(() => {
    expect(second.result.config()).toEqual(CONFIG)
    expect(second.result.state()).toMatchObject({endsAt: 10_000, status: 'running'})
  })

  second.result.onPause()

  await vi.waitFor(() => {
    expect(first.result.state()).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'paused',
    })
  })

  first.cleanup()
  second.cleanup()
})

it('should deliver lifecycle events for a cross-tab phase transition', async () => {
  const sourceEvents = vi.fn()
  const receiverEvents = vi.fn()
  const source = renderHook(() => usePomodoroTimer({onEvents: sourceEvents}), {
    wrapper: PreferenceProvider,
  })
  const receiver = renderHook(() => usePomodoroTimer({onEvents: receiverEvents}), {
    wrapper: PreferenceProvider,
  })
  await Promise.all([finishInitialization(source), finishInitialization(receiver)])

  source.result.onConfigChange(CONFIG)
  source.result.onAutoStartChange(true)
  source.result.onStart()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      endsAt: 10_000,
      phase: 'focus',
      status: 'running',
    })
  })
  receiverEvents.mockClear()

  vi.setSystemTime(10_000)
  source.result.onNextPhase()

  await vi.waitFor(() => {
    expect(receiverEvents).toHaveBeenCalledExactlyOnceWith(['focus-end', 'break-start'], {
      isCatchUp: true,
    })
  })

  source.cleanup()
  receiver.cleanup()
})

it('should not deliver lifecycle events when resetting a cross-tab running phase', async () => {
  const sourceEvents = vi.fn()
  const receiverEvents = vi.fn()
  const source = renderHook(() => usePomodoroTimer({onEvents: sourceEvents}), {
    wrapper: PreferenceProvider,
  })
  const receiver = renderHook(() => usePomodoroTimer({onEvents: receiverEvents}), {
    wrapper: PreferenceProvider,
  })
  await Promise.all([finishInitialization(source), finishInitialization(receiver)])

  source.result.onConfigChange(CONFIG)
  source.result.onStart()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      endsAt: 10_000,
      phase: 'focus',
      status: 'running',
    })
  })
  sourceEvents.mockClear()
  receiverEvents.mockClear()

  source.result.onReset()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })

  expect(sourceEvents).not.toHaveBeenCalled()
  expect(receiverEvents).not.toHaveBeenCalled()
  source.cleanup()
  receiver.cleanup()
})

it('should catch up an expired cross-tab running state before persisting it', async () => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(0)
  const source = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  const receiver = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await Promise.all([finishInitialization(source), finishInitialization(receiver)])

  source.result.onConfigChange(CONFIG)
  source.result.onStart()
  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      endsAt: 10_000,
      phase: 'focus',
      status: 'running',
    })
  })

  vi.setSystemTime(20_000)
  source.result.onAutoStartChange(false)

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 1,
      phase: 'shortBreak',
      remainingSeconds: 4,
      status: 'idle',
    })
  })

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '')).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  source.cleanup()
  receiver.cleanup()
})
