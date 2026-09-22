/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PomodoroPhase, PomodoroTimerConfig} from '../features/pomodoro-timer/model'
import {usePomodoroTimer} from '../features/pomodoro-timer/use-pomodoro-timer'

const CONFIG: PomodoroTimerConfig = {
  focusSeconds: 10,
  focusSessionsPerCycle: 4,
  longBreakSeconds: 8,
  shortBreakSeconds: 4,
}

const finishInitialization = async (view: {result: ReturnType<typeof usePomodoroTimer>}) => {
  await view.result.waitForInitialization()
}

const pauseOnPhase = (
  timer: ReturnType<typeof usePomodoroTimer>,
  phase: PomodoroPhase,
) => {
  timer.onConfigChange(CONFIG)
  timer.onStart()

  if (phase === 'focus') {
    timer.onPause()
    return
  }

  if (phase === 'shortBreak') {
    vi.setSystemTime(10_000)
    document.dispatchEvent(new Event('visibilitychange'))
    timer.onPause()
    return
  }

  for (let session = 0; session < CONFIG.focusSessionsPerCycle; session += 1) {
    vi.setSystemTime((session + 1) * 10_000)
    document.dispatchEvent(new Event('visibilitychange'))
  }
  timer.onPause()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('pomodoro config change while paused', () => {
  it.each([
    {phase: 'focus' as const},
    {phase: 'shortBreak' as const},
    {phase: 'longBreak' as const},
  ])('should not emit phase-end when paused on $phase', async ({phase}) => {
    const onEvents = vi.fn()
    const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
    await finishInitialization(view)
    pauseOnPhase(view.result, phase)
    onEvents.mockClear()

    view.result.onConfigChange({...CONFIG, focusSeconds: 20})

    expect(onEvents.mock.calls.map(([events]) => events)).toEqual([])
    view.cleanup()
  })
})
