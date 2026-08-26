/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig, PomodoroTimerState} from '../model'
import {usePomodoroTimer} from '../use-pomodoro-timer'

const autoStartMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<boolean>>(),
  write: vi.fn<(isEnabled: boolean) => Promise<void>>(),
}))

vi.mock('../auto-start-storage', () => ({
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

const finishMount = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

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

  const view = renderHook(usePomodoroTimer)
  await finishMount()

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

  const invalidSchemaView = renderHook(usePomodoroTimer)
  await finishMount()

  expect(invalidSchemaView.result.config().focusSeconds).toBe(1_500)
  expect(invalidSchemaView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  invalidSchemaView.cleanup()

  localStorage.setItem(CONFIG_STORAGE_KEY, '{invalid')
  localStorage.setItem(STATE_STORAGE_KEY, '{invalid')

  const malformedView = renderHook(usePomodoroTimer)
  await finishMount()

  expect(malformedView.result.config().focusSeconds).toBe(1_500)
  expect(malformedView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  malformedView.cleanup()
})

it('should use defaults when reading storage throws', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('storage denied')
  })

  const view = renderHook(usePomodoroTimer)
  await finishMount()

  expect(view.result.config().focusSeconds).toBe(1_500)
  expect(view.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  view.cleanup()
})

it('should continue operating when storage writes throw', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('storage full')
  })

  const view = renderHook(usePomodoroTimer)
  await finishMount()

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

  const view = renderHook(() => usePomodoroTimer({onEvents}))
  await finishMount()

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
  expect(onEvents).toHaveBeenCalledWith(['focus-end', 'break-start'])
  view.cleanup()
})

it('should restore an already expired running timer as an inactive next phase', async () => {
  const runningState = {
    completedFocusSessions: 0,
    endsAt: 1,
    phase: 'focus',
    status: 'running',
  } satisfies PomodoroTimerState
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningState))
  vi.setSystemTime(1_000)

  const view = renderHook(usePomodoroTimer)
  await finishMount()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  view.cleanup()
})

it('should preserve changes made while the auto-start preference is loading', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)

  const view = renderHook(usePomodoroTimer)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()
  await vi.advanceTimersByTimeAsync(250)

  expect(view.result.state().status).toBe('running')
  expect(autoStartMocks.write).toHaveBeenCalledWith(true)

  preference.resolve(false)
  await finishMount()

  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(view.result.state().status).toBe('running')
  view.cleanup()
})

it('should abandon pending preference restoration after cleanup', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)
  const view = renderHook(usePomodoroTimer)

  view.cleanup()
  preference.resolve(true)
  await finishMount()

  expect(view.result.isAutoStartEnabled()).toBe(false)
})

it('should expose every timer action and derived value', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}))
  await finishMount()

  view.result.onConfigChange(CONFIG)
  expect(view.result.config()).toEqual(CONFIG)
  expect(view.result.remainingSeconds()).toBe(10)

  view.result.onStart()
  expect(view.result.state()).toEqual({
    completedFocusSessions: 0,
    endsAt: 10_000,
    phase: 'focus',
    status: 'running',
  })
  expect(onEvents).toHaveBeenLastCalledWith(['focus-start'])

  vi.setSystemTime(5_000)
  await vi.advanceTimersByTimeAsync(250)
  expect(view.result.remainingSeconds()).toBe(5)
  expect(view.result.progress()).toBe(0.5)

  view.result.onPause()
  expect(view.result.state()).toMatchObject({remainingSeconds: 5, status: 'paused'})

  view.result.onNextPhase()
  expect(view.result.state()).toMatchObject({phase: 'shortBreak', remainingSeconds: 4})

  view.result.onReset()
  expect(view.result.state()).toMatchObject({phase: 'focus', remainingSeconds: 10})

  view.result.onStart()
  view.result.onStop()
  expect(view.result.state()).toMatchObject({phase: 'focus', remainingSeconds: 10, status: 'idle'})
  expect(onEvents).toHaveBeenLastCalledWith(['focus-end'])
  view.cleanup()
})

it('should refresh on visibility changes and stop after owner cleanup', async () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const view = renderHook(usePomodoroTimer)
  await finishMount()

  document.dispatchEvent(new Event('visibilitychange'))
  view.result.onStart()
  const initialRemainingSeconds = view.result.remainingSeconds()
  vi.setSystemTime(1_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(view.result.remainingSeconds()).toBe(initialRemainingSeconds - 1)
  expect(add).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})

  view.cleanup()
  vi.setSystemTime(2_000)
  document.dispatchEvent(new Event('visibilitychange'))

  expect(view.result.remainingSeconds()).toBe(initialRemainingSeconds - 1)
  expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
})
