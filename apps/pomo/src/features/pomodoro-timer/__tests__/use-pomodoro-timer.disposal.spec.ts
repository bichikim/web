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

it('should emit lifecycle events and persist a stopped timer on unmount', async () => {
  const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame')
  const onEvents = vi.fn()
  const timer = renderHook(() => usePomodoroTimer({onEvents, stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onStart()
  expect(timer.result.state().status).toBe('running')
  onEvents.mockClear()
  timer.cleanup()
  expect(onEvents).toHaveBeenCalledTimes(1)
  expect(onEvents).toHaveBeenCalledWith(['focus-end'])
  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}').status).toBe('idle')
  expect(cancelFrame).toHaveBeenCalledTimes(1)
  const restored = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await finishInitialization(restored)
  expect(restored.result.state().status).toBe('idle')
  restored.cleanup()
})

it('should synchronize a stopped timer to other tabs when disabled on unmount', async () => {
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)

  const receiver = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await finishInitialization(receiver)
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)

  timer.result.onConfigChange(CONFIG)
  timer.result.onStart()

  expect(receiver.result.state().status).toBe('running')

  timer.cleanup()

  expect(receiver.result.state()).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })

  receiver.cleanup()
})

it('should preserve paused progress when disabled on unmount', async () => {
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onConfigChange(CONFIG)
  timer.result.onStart()
  vi.setSystemTime(1_000)
  timer.result.onPause()

  expect(timer.result.state()).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'paused',
  })

  timer.cleanup()

  const restored = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(restored)

  expect(restored.result.state()).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'idle',
  })

  restored.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'idle',
  })
})

it('should preserve running progress when disabled on unmount', async () => {
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onConfigChange(CONFIG)
  timer.result.onStart()
  vi.setSystemTime(1_000)

  timer.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'idle',
  })
})

it('should preserve paused progress after auto-start catch-up on unmount', async () => {
  const runningBreak = {
    completedFocusSessions: 1,
    endsAt: 4_000,
    phase: 'shortBreak',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningBreak))
  autoStartMocks.read.mockResolvedValue(true)

  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  vi.setSystemTime(5_000)
  timer.result.onPause()

  expect(timer.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'paused',
  })

  timer.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 9,
    status: 'idle',
  })
})

it('should preserve an expired running phase when stopping on unmount', async () => {
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

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 0,
    status: 'idle',
  })
})

it('should catch up every expired phase before stopping on unmount with auto-start enabled', async () => {
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onConfigChange(CONFIG)
  timer.result.onAutoStartChange(true)
  timer.result.onStart()

  vi.setSystemTime(14_000)
  timer.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}')).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
})
