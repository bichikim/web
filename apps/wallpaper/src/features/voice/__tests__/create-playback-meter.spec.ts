import {afterEach, expect, it, vi} from 'vitest'
import {createPlaybackMeter} from '../create-playback-meter'

afterEach(() => vi.unstubAllGlobals())
it('should meter the actual playback clock rather than queued clips and close on cancellation', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  const cancel = vi.fn()
  vi.stubGlobal('cancelAnimationFrame', cancel)
  let clock = 1
  const onLevel = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel})
  const stop = meter.track({sampleRate: 100, samples: new Float32Array(100).fill(0.2)}, 2, 1)
  step(0)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  clock = 2.1
  step(16)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(0.5)
  clock = 3.1
  step(32)
  expect(onLevel.mock.lastCall![0]).toBeLessThan(0.1)
  stop()
  expect(onLevel).toHaveBeenLastCalledWith(0)
  expect(cancel).toHaveBeenCalled()
  meter.dispose()
})
it('should read the sped-up sample position and leave another queued clip active after a clip ends', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 0
  const onLevel = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel})
  const samples = new Float32Array(100)
  samples.fill(0.2, 50)
  const stop = meter.track({sampleRate: 100, samples}, 0, 2)
  meter.track({sampleRate: 100, samples}, 1, 1)
  clock = 0.1
  step(0)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  clock = 0.3
  step(16)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(0.5)
  stop()
  clock = 1.7
  step(32)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(0.5)
  meter.dispose()
  expect(onLevel).toHaveBeenLastCalledWith(0)
})
