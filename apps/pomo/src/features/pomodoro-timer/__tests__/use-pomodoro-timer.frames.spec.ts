/** @vitest-environment jsdom */
import {CONFIG, finishInitialization} from './fixtures/timer'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {usePomodoroTimer} from '../use-pomodoro-timer'

it('should wait for the first frame before refreshing elapsed wall time', async () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onStart()
  vi.setSystemTime(1_000)
  expect(view.result.remainingSeconds()).toBe(10)
  expect(request).toHaveBeenCalledTimes(1)
  request.mock.calls[0]![0](99_999)
  expect(view.result.remainingSeconds()).toBe(9)
  expect(view.result.progress()).toBe(0.1)
  expect(request).toHaveBeenCalledTimes(2)
  view.cleanup()
})

it('should catch up on visibility without waiting for another frame', async () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()
  onEvents.mockClear()
  vi.setSystemTime(15_000)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(view.result.remainingSeconds()).toBe(9)
  expect(onEvents).toHaveBeenCalledExactlyOnceWith(
    ['focus-end', 'break-start', 'break-end', 'focus-start'],
    {isCatchUp: true},
  )
  expect(request).toHaveBeenCalledTimes(1)
  request.mock.calls[0]![0](0)
  expect(onEvents).toHaveBeenCalledTimes(1)
  view.cleanup()
})

it('should cancel a pending frame and suppress a stale callback after cleanup', async () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(7)
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
  const view = renderHook(usePomodoroTimer, {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onStart()
  const callback = request.mock.calls[0]![0]
  view.cleanup()
  expect(cancel).toHaveBeenCalledExactlyOnceWith(7)
  vi.setSystemTime(1_000)
  callback(0)
  expect(view.result.remainingSeconds()).toBe(10)
  expect(request).toHaveBeenCalledTimes(1)
})

it('should not reschedule when an event handler disposes the owner during a frame', async () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onStart()
  onEvents.mockImplementationOnce(() => view.cleanup())
  vi.setSystemTime(10_000)
  request.mock.calls[0]![0](0)
  expect(view.result.state()).toMatchObject({
    phase: 'shortBreak',
    remainingSeconds: 4,
    status: 'idle',
  })
  expect(request).toHaveBeenCalledTimes(1)
})

it('should rethrow an event handler error and stop frame refreshes', async () => {
  const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1)
  const onEvents = vi.fn()
  const view = renderHook(() => usePomodoroTimer({onEvents}), {wrapper: PreferenceProvider})
  await finishInitialization(view)
  view.result.onConfigChange(CONFIG)
  view.result.onAutoStartChange(true)
  view.result.onStart()
  const callback = request.mock.calls[0]![0]
  const error = new Error('Event delivery failed')
  onEvents.mockImplementationOnce(() => {
    throw error
  })
  vi.setSystemTime(10_000)
  expect(() => callback(0)).toThrow(error)
  expect(request).toHaveBeenCalledTimes(1)
  const remaining = view.result.remainingSeconds()
  vi.setSystemTime(11_000)
  callback(0)
  expect(view.result.remainingSeconds()).toBe(remaining)
  expect(request).toHaveBeenCalledTimes(1)
  view.cleanup()
})
