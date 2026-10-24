/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {createMotionEnvironment} from '../motion-environment'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should read the current global sensor without acquiring it eagerly', () => {
  const environment = createMotionEnvironment()
  expect(environment.getSensor()).toBeNull()
  const sensor = class extends Event {}
  vi.stubGlobal('DeviceOrientationEvent', sensor)
  expect(environment.getSensor()).toBe(sensor)
})

it('should forward frame and timer cancellation through the browser bindings', () => {
  const callback = vi.fn()
  const cancelFrame = vi.fn()
  const clearTimer = vi.fn()
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 7),
  )
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  vi.stubGlobal(
    'setTimeout',
    vi.fn(() => 9),
  )
  vi.stubGlobal('clearTimeout', clearTimer)
  const environment = createMotionEnvironment()

  environment.cancelFrame(environment.requestFrame(callback))
  environment.clearTimer(environment.setTimer(callback, 150))

  expect(cancelFrame).toHaveBeenCalledWith(7)
  expect(clearTimer).toHaveBeenCalledWith(9)
  expect(requestAnimationFrame).toHaveBeenCalledWith(callback)
  expect(setTimeout).toHaveBeenCalledWith(callback, 150)
})
