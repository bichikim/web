import {afterEach, expect, it, vi} from 'vitest'

import {createBlinkScheduler} from '../blink-scheduler'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should schedule a randomized blink and continue scheduling afterward', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const onBlink = vi.fn()
  const scheduler = createBlinkScheduler({maximumDelay: 200, minimumDelay: 100, onBlink})

  scheduler.start()
  scheduler.start()
  await vi.advanceTimersByTimeAsync(150)

  expect(onBlink).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(1)
  scheduler.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('should prevent overlapping manual blinks and preserve a schedule started during a blink', async () => {
  let completeBlink: () => void = () => undefined
  const onBlink = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeBlink = resolve
      }),
  )
  const setTimer = vi.fn(() => 1 as unknown as ReturnType<typeof setTimeout>)
  const clearTimer = vi.fn()
  const scheduler = createBlinkScheduler({
    clearTimer,
    maximumDelay: 10,
    minimumDelay: 20,
    onBlink,
    random: () => 1,
    setTimer: setTimer as unknown as typeof setTimeout,
  })

  const blink = scheduler.blink()
  await scheduler.blink()
  scheduler.start()
  completeBlink()
  await blink

  expect(onBlink).toHaveBeenCalledOnce()
  expect(setTimer).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 20)
  scheduler.destroy()
  expect(clearTimer).toHaveBeenCalledOnce()
})

it('should report a scheduled blink failure', async () => {
  const failure = new Error('blink failed')
  const reportError = vi.fn()
  vi.stubGlobal('reportError', reportError)
  let runTimer: () => void = () => undefined
  const scheduler = createBlinkScheduler({
    maximumDelay: 1,
    minimumDelay: 1,
    onBlink: () => Promise.reject(failure),
    setTimer: ((callback: Parameters<typeof setTimeout>[0]) => {
      runTimer = callback as () => void
      return 1 as unknown as ReturnType<typeof setTimeout>
    }) as typeof setTimeout,
  })
  scheduler.start()

  runTimer()
  await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(failure))
  scheduler.destroy()
})

it('should ignore work after destruction even without a scheduled timer', async () => {
  const onBlink = vi.fn()
  const scheduler = createBlinkScheduler({maximumDelay: 1, minimumDelay: 1, onBlink})

  scheduler.destroy()
  scheduler.destroy()
  scheduler.start()
  await scheduler.blink()

  expect(onBlink).not.toHaveBeenCalled()
})

it('should not reschedule a blink that completes after destruction', async () => {
  let completeBlink: () => void = () => undefined
  const scheduler = createBlinkScheduler({
    maximumDelay: 1,
    minimumDelay: 1,
    onBlink: () =>
      new Promise<void>((resolve) => {
        completeBlink = resolve
      }),
  })
  const blink = scheduler.blink()

  scheduler.destroy()
  completeBlink()
  await blink
})
