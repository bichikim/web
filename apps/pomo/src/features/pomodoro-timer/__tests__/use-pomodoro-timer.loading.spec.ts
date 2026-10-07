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

it('should preserve changes made while the auto-start preference is loading', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()
  await vi.advanceTimersByTimeAsync(250)

  expect(view.result.state().status).toBe('running')
  expect(autoStartMocks.write).not.toHaveBeenCalled()

  preference.resolve(false)
  await finishInitialization(view)

  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(view.result.state().status).toBe('running')
  view.cleanup()
})

it('should persist a running timer when unmounted before auto-start initialization', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  view.result.onConfigChange(CONFIG)
  view.result.onStart()

  view.cleanup()

  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '')).toEqual({
    completedFocusSessions: 0,
    endsAt: 10_000,
    phase: 'focus',
    status: 'running',
  })
  expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? '')).toEqual(CONFIG)

  preference.resolve(false)
  await preference.promise
})

it('should recover auto-start catch-up after pausing an expired restore while loading', async () => {
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

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  expect(onEvents).not.toHaveBeenCalled()

  preference.resolve(true)
  await finishInitialization(view)

  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(view.result.state()).toEqual({
    completedFocusSessions: 3,
    endsAt: 44_001,
    phase: 'focus',
    status: 'running',
  })
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(
    [
      'focus-end',
      'break-start',
      'break-end',
      'focus-start',
      'focus-end',
      'long-break-start',
      'long-break-end',
      'focus-start',
      'focus-end',
      'break-start',
      'break-end',
      'focus-start',
    ],
    {isCatchUp: true},
  )
  view.cleanup()
})

it('should recover auto-start catch-up after a cross-tab update while loading', async () => {
  const preference = createDeferred<boolean>()
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

  const source = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  const receiver = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  source.result.onAutoStartChange(true)

  await vi.waitFor(() => expect(receiver.result.isAutoStartEnabled()).toBe(true))
  preference.resolve(true)
  await finishInitialization(receiver)

  expect(receiver.result.state()).toEqual({
    completedFocusSessions: 3,
    endsAt: 44_001,
    phase: 'focus',
    status: 'running',
  })
  source.cleanup()
  receiver.cleanup()
})

it('should preserve a cross-tab reset while the auto-start preference is loading', async () => {
  const preference = createDeferred<boolean>()
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

  const source = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  const receiver = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  source.result.onReset()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
  })

  preference.resolve(true)
  await finishInitialization(receiver)

  expect(receiver.result.state()).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
  source.cleanup()
  receiver.cleanup()
})

it('should preserve the latest cross-tab start after resetting while loading', async () => {
  const preference = createDeferred<boolean>()
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  autoStartMocks.read.mockReturnValue(preference.promise)
  vi.setSystemTime(5_000)

  const source = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  const receiver = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  source.result.onReset()
  source.result.onStart()

  await vi.waitFor(() => {
    expect(receiver.result.state()).toEqual({
      completedFocusSessions: 0,
      endsAt: 15_000,
      phase: 'focus',
      status: 'running',
    })
  })

  preference.resolve(true)
  await finishInitialization(receiver)

  expect(receiver.result.state()).toEqual({
    completedFocusSessions: 0,
    endsAt: 15_000,
    phase: 'focus',
    status: 'running',
  })
  source.cleanup()
  receiver.cleanup()
})

it('should preserve a configuration change after pausing an expired restore while loading', async () => {
  const preference = createDeferred<boolean>()
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

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  view.result.onPause()
  const nextConfig = {...CONFIG, focusSeconds: 20}
  view.result.onConfigChange(nextConfig)

  preference.resolve(true)
  await finishInitialization(view)

  expect(view.result.config()).toEqual(nextConfig)
  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  view.cleanup()
})

it('should abandon pending preference restoration after cleanup', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})

  view.cleanup()
  preference.resolve(true)
  await preference.promise

  expect(view.result.isAutoStartEnabled()).toBe(false)
})
