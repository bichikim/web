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

it('should synchronize an expired phase on the next frame without duplicate events', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onStart()
  onEvents.mockClear()
  vi.setSystemTime(12_000)
  vi.advanceTimersToNextFrame()
  expect(view.result.state()).toMatchObject({phase: 'shortBreak', status: 'idle'})
  expect(onEvents).toHaveBeenCalledTimes(1)
  vi.advanceTimersToNextFrame()
  expect(onEvents).toHaveBeenCalledTimes(1)
  view.cleanup()
})

it('should synchronize an expired phase before applying a new configuration', async () => {
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onStart()

  vi.setSystemTime(12_000)
  const nextConfig = {...CONFIG, focusSeconds: 20}
  view.result.onConfigChange(nextConfig)

  expect(view.result.config()).toEqual(nextConfig)
  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  view.cleanup()
})

it('should synchronize an expired break before advancing with auto-start enabled', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()

  vi.setSystemTime(10_000)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(view.result.state()).toMatchObject({phase: 'shortBreak', status: 'running'})
  onEvents.mockClear()

  vi.setSystemTime(15_000)
  view.result.onNextPhase()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    endsAt: 24_000,
    phase: 'focus',
    status: 'running',
  })
  expect(view.result.remainingSeconds()).toBe(9)
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(['break-end', 'focus-start'], {
    isCatchUp: true,
  })
  view.cleanup()
})

it.each([
  {
    currentTime: 15_000,
    events: ['focus-end', 'break-start', 'break-end', 'focus-start'],
    expectedCompletedFocusSessions: 1,
    expectedEndsAt: 24_000,
    initialState: {completedFocusSessions: 0, endsAt: 10_000, phase: 'focus'},
  },
  {
    currentTime: 5_000,
    events: ['long-break-end', 'focus-start'],
    expectedCompletedFocusSessions: 2,
    expectedEndsAt: 14_000,
    initialState: {completedFocusSessions: 2, endsAt: 4_000, phase: 'longBreak'},
  },
] as const)(
  'should synchronize an expired $initialState.phase before advancing',
  async (scenario) => {
    const onEvents = vi.fn()
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
    localStorage.setItem(
      STATE_STORAGE_KEY,
      JSON.stringify({...scenario.initialState, status: 'running'}),
    )
    autoStartMocks.read.mockResolvedValue(true)

    const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
    await finishInitialization(view)
    vi.setSystemTime(scenario.currentTime)
    view.result.onNextPhase()

    expect(view.result.state()).toMatchObject({
      completedFocusSessions: scenario.expectedCompletedFocusSessions,
      endsAt: scenario.expectedEndsAt,
      phase: 'focus',
      status: 'running',
    })
    expect(view.result.remainingSeconds()).toBe(9)
    expect(onEvents).toHaveBeenCalledExactlyOnceWith(scenario.events, {isCatchUp: true})
    view.cleanup()
  },
)

it('should preserve manual advancement for an unfinished running phase with auto-start enabled', async () => {
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()
  onEvents.mockClear()

  vi.setSystemTime(5_000)
  view.result.onNextPhase()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(['focus-end'])
  view.cleanup()
})

it('should synchronize an expired running break before applying configuration changes', async () => {
  const runningBreak = {
    completedFocusSessions: 1,
    endsAt: 4_000,
    phase: 'shortBreak',
    status: 'running',
  } satisfies PomodoroTimerState
  const nextConfig = {...CONFIG, shortBreakSeconds: 8}
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningBreak))
  autoStartMocks.read.mockResolvedValue(true)

  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  vi.setSystemTime(5_000)

  view.result.onConfigChange(nextConfig)

  expect(view.result.config()).toEqual(nextConfig)
  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
  view.cleanup()
})

it.each([
  {completedFocusSessions: 1, endsAt: 10_000, phase: 'shortBreak'},
  {completedFocusSessions: 2, endsAt: 12_000, phase: 'longBreak'},
] as const)(
  'should reset an unfinished running $phase to focus before applying configuration changes',
  async (scenario) => {
    const runningBreak = {
      completedFocusSessions: scenario.completedFocusSessions,
      endsAt: scenario.endsAt,
      phase: scenario.phase,
      status: 'running',
    } satisfies PomodoroTimerState
    const nextConfig = {...CONFIG, longBreakSeconds: 9, shortBreakSeconds: 8}
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningBreak))

    const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
    await finishInitialization(view)
    vi.setSystemTime(5_000)

    view.result.onConfigChange(nextConfig)

    expect(view.result.config()).toEqual(nextConfig)
    expect(view.result.state()).toEqual({
      completedFocusSessions: scenario.completedFocusSessions,
      phase: 'focus',
      remainingSeconds: 10,
      status: 'idle',
    })
    view.cleanup()
  },
)

it('should stop after the first expired phase when applying configuration changes', async () => {
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()

  vi.setSystemTime(25_000)
  const nextConfig = {...CONFIG, focusSeconds: 20}
  view.result.onConfigChange(nextConfig)

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  view.cleanup()
})

it('should catch up every expired phase before stopping with auto-start enabled', async () => {
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()

  vi.setSystemTime(15_000)
  view.result.onStop()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
  view.cleanup()
})

it('should synchronize an expired running break before stopping', async () => {
  const runningBreak = {
    completedFocusSessions: 1,
    endsAt: 4_000,
    phase: 'shortBreak',
    status: 'running',
  } satisfies PomodoroTimerState
  const onEvents = vi.fn()
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(CONFIG))
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(runningBreak))

  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  vi.setSystemTime(5_000)

  view.result.onStop()

  expect(view.result.state()).toEqual({
    completedFocusSessions: 1,
    phase: 'focus',
    remainingSeconds: 10,
    status: 'idle',
  })
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(['break-end'])
  view.cleanup()
})
