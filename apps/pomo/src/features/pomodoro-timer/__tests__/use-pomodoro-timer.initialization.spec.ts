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

it('should restore valid configuration and paused state before persisting them', async () => {
  const pausedState = {
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 3,
    status: 'paused',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(pausedState))
  autoStartMocks.read.mockResolvedValue(true)

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(view.result.config()).toEqual(CONFIG)
  expect(view.result.state()).toEqual(pausedState)
  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(view.result.remainingSeconds()).toBe(3)
  expect(view.result.progress()).toBe(0.25)
  expect(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) ?? '')).toEqual(CONFIG)
  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '')).toEqual(pausedState)

  view.cleanup()
})

it('should replace malformed and schema-invalid stored values with defaults', async () => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({...CONFIG, focusSeconds: 0}))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({phase: 'invalid', status: 'idle'}))

  const invalidSchemaView = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(invalidSchemaView)

  expect(invalidSchemaView.result.config().focusSeconds).toBe(1_500)
  expect(invalidSchemaView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  invalidSchemaView.cleanup()

  localStorage.setItem(CONFIG_STORAGE_KEY, '{invalid')
  localStorage.setItem(STATE_STORAGE_KEY, '{invalid')

  const malformedView = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(malformedView)

  expect(malformedView.result.config().focusSeconds).toBe(1_500)
  expect(malformedView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  malformedView.cleanup()
})

it('should use defaults when reading storage throws', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('storage denied')
  })

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(view.result.config().focusSeconds).toBe(1_500)
  expect(view.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  view.cleanup()
})

it('should continue operating when storage writes throw', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('storage full')
  })

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(() => view.result.onConfigChange(CONFIG)).not.toThrow()
  expect(view.result.config()).toEqual(CONFIG)
  expect(view.result.state()).toMatchObject({remainingSeconds: 10, status: 'idle'})
  view.cleanup()
})

it('should synchronize a running stored timer and publish mount events', async () => {
  const onEvents = vi.fn()
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1_000,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  autoStartMocks.read.mockResolvedValue(true)

  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(view.result.state()).toEqual(runningState)
  expect(onEvents).not.toHaveBeenCalled()

  vi.setSystemTime(1_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    endsAt: 5_000,
    phase: 'shortBreak',
    status: 'running',
  })
  expect(onEvents).toHaveBeenCalledWith(['focus-end', 'break-start'], {isCatchUp: true})
  view.cleanup()
})

it('should restore an already expired running timer as an inactive next phase without events', async () => {
  const onEvents = vi.fn()
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  vi.setSystemTime(1_000)

  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  expect(onEvents).not.toHaveBeenCalled()
  view.cleanup()
})

it('should publish transitions when restoring an expired timer with auto-start enabled', async () => {
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  const onEvents = vi.fn()
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  autoStartMocks.read.mockResolvedValue(true)
  vi.setSystemTime(1_000)

  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    endsAt: 4_001,
    phase: 'shortBreak',
    status: 'running',
  })
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(['focus-end', 'break-start'], {
    isCatchUp: true,
  })
  view.cleanup()
})
