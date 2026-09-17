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

interface TimerView {
  readonly result: {
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

  const invalidSchemaView = renderHook(usePomodoroTimer)
  await finishInitialization(invalidSchemaView)

  expect(invalidSchemaView.result.config().focusSeconds).toBe(1_500)
  expect(invalidSchemaView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  invalidSchemaView.cleanup()

  localStorage.setItem(CONFIG_STORAGE_KEY, '{invalid')
  localStorage.setItem(STATE_STORAGE_KEY, '{invalid')

  const malformedView = renderHook(usePomodoroTimer)
  await finishInitialization(malformedView)

  expect(malformedView.result.config().focusSeconds).toBe(1_500)
  expect(malformedView.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  malformedView.cleanup()
})

it('should use defaults when reading storage throws', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('storage denied')
  })

  const view = renderHook(usePomodoroTimer)
  await finishInitialization(view)

  expect(view.result.config().focusSeconds).toBe(1_500)
  expect(view.result.state()).toMatchObject({phase: 'focus', status: 'idle'})
  view.cleanup()
})

it('should continue operating when storage writes throw', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('storage full')
  })

  const view = renderHook(usePomodoroTimer)
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

  const view = renderHook(() => usePomodoroTimer({onEvents}))
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
  await finishInitialization(view)

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
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

  const view = renderHook(() => usePomodoroTimer({onEvents}))
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
  await finishInitialization(view)

  expect(view.result.isAutoStartEnabled()).toBe(true)
  expect(view.result.state().status).toBe('running')
  view.cleanup()
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

  const view = renderHook(() => usePomodoroTimer({onEvents}))
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

  const source = renderHook(usePomodoroTimer)
  const receiver = renderHook(usePomodoroTimer)
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

  const source = renderHook(usePomodoroTimer)
  const receiver = renderHook(usePomodoroTimer)
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

  const source = renderHook(usePomodoroTimer)
  const receiver = renderHook(usePomodoroTimer)
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

  const view = renderHook(usePomodoroTimer)
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

it('should synchronize timer actions between mounted controllers', async () => {
  const first = renderHook(() => usePomodoroTimer())
  const second = renderHook(() => usePomodoroTimer())
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

it('should abandon pending preference restoration after cleanup', async () => {
  const preference = createDeferred<boolean>()
  autoStartMocks.read.mockReturnValue(preference.promise)
  const view = renderHook(usePomodoroTimer)

  view.cleanup()
  preference.resolve(true)
  await preference.promise

  expect(view.result.isAutoStartEnabled()).toBe(false)
})
