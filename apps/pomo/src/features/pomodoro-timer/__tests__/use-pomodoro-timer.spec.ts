/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
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

interface TimerView {
  readonly result: {
    readonly waitForInitialization: () => Promise<void>
  }
}

const finishInitialization = async (view: TimerView) => {
  await view.result.waitForInitialization()
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

it('should persist a stopped timer when disabled on unmount', async () => {
  const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame')
  const timer = renderHook(() => usePomodoroTimer({stopOnUnmount: true}), {
    wrapper: PreferenceProvider,
  })
  await finishInitialization(timer)
  timer.result.onStart()
  expect(timer.result.state().status).toBe('running')
  timer.cleanup()
  expect(JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) ?? '{}').status).toBe('idle')
  expect(cancelFrame).toHaveBeenCalledTimes(1)
  const restored = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await finishInitialization(restored)
  expect(restored.result.state().status).toBe('idle')
  restored.cleanup()
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

it('should synchronize an expired timer before stopping it on unmount', async () => {
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
    completedFocusSessions: 1,
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
})

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
