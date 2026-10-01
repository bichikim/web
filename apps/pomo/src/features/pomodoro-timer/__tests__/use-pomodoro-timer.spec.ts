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

it('should expose every timer action and derived value', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

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

it('should not emit lifecycle events when resetting a running phase', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  view.result.onConfigChange(CONFIG)
  view.result.onStart()
  onEvents.mockClear()

  view.result.onReset()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 0,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
  expect(onEvents).not.toHaveBeenCalled()
  view.cleanup()
})

it.each([
  {completedFocusSessions: 0, phase: 'focus'},
  {completedFocusSessions: 1, phase: 'shortBreak'},
  {completedFocusSessions: 2, phase: 'longBreak'},
] as const)('should not emit lifecycle events when changing a paused $phase', async (scenario) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(
    STATE_STORAGE_KEY,
    JSON.stringify({
      completedFocusSessions: scenario.completedFocusSessions,
      phase: scenario.phase,
      remainingSeconds: 5,
      status: 'paused',
    }),
  )
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)

  const nextConfig = {...CONFIG, focusSeconds: 20}
  view.result.onConfigChange(nextConfig)

  expect(view.result.config()).toEqual(nextConfig)
  expect(view.result.state()).toMatchObject({phase: scenario.phase, status: 'idle'})
  expect(onEvents).not.toHaveBeenCalled()
  view.cleanup()
})

it('should refresh on visibility changes and stop after owner cleanup', async () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)

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

it('should stop frame updates after cleanup', async () => {
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onStart()
  vi.setSystemTime(1_000)
  vi.advanceTimersToNextFrame()
  const remaining = view.result.remainingSeconds()
  view.cleanup()
  vi.setSystemTime(2_000)
  vi.advanceTimersToNextFrame()
  expect(view.result.remainingSeconds()).toBe(remaining)
})
it.each(['refresh', 'pause'] as const)(
  'should publish every elapsed phase once when a delayed %s lands on focus',
  async (action) => {
    const onEvents = vi.fn()
    const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
    await finishInitialization(view)
    view.result.onConfigChange(CONFIG)
    view.result.onAutoStartChange(true)
    view.result.onStart()
    onEvents.mockClear()

    vi.setSystemTime(15_000)
    if (action === 'pause') {
      view.result.onPause()
    } else {
      document.dispatchEvent(new Event('visibilitychange'))
    }

    expect(view.result.state()).toMatchObject({
      completedFocusSessions: 1,
      phase: 'focus',
      status: action === 'pause' ? 'paused' : 'running',
    })
    expect(onEvents).toHaveBeenCalledExactlyOnceWith(
      ['focus-end', 'break-start', 'break-end', 'focus-start'],
      {isCatchUp: true},
    )
    document.dispatchEvent(new Event('visibilitychange'))
    expect(onEvents).toHaveBeenCalledTimes(1)
    view.cleanup()
  },
)

it.each([
  {completedFocusSessions: 1, endEvent: 'break-end', phase: 'shortBreak'},
  {completedFocusSessions: 2, endEvent: 'long-break-end', phase: 'longBreak'},
] as const)('should publish focus start when pausing after $phase expires', async (scenario) => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(
    STATE_STORAGE_KEY,
    JSON.stringify({
      completedFocusSessions: scenario.completedFocusSessions,
      endsAt: 4_000,
      phase: scenario.phase,
      status: 'running',
    }),
  )
  autoStartMocks.read.mockResolvedValue(true)
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  vi.setSystemTime(5_000)
  view.result.onPause()
  expect(view.result.state()).toMatchObject({phase: 'focus', remainingSeconds: 9, status: 'paused'})
  expect(onEvents).toHaveBeenCalledExactlyOnceWith([scenario.endEvent, 'focus-start'], {
    isCatchUp: true,
  })
  view.result.onStart()
  expect(onEvents).toHaveBeenCalledTimes(1)
  view.cleanup()
})
