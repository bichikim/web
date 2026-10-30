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

it('should publish distinct vowel shapes against the scheduled playback clock and clear them on stop', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 0
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn(), onShape})
  const stop = meter.track(
    {sampleRate: 100, samples: new Float32Array(500).fill(0.2), text: '아이우에오'},
    1,
    1,
  )
  step(0)
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
  for (const [index, shape] of ['a', 'i', 'u', 'e', 'o'].entries()) {
    clock = 1.2 + index
    step(0)
    expect(onShape).toHaveBeenLastCalledWith(shape, expect.any(Number))
  }
  stop()
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
})

it('should show the vowel after a short lip closure using the sped-up audio clock', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 1
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn(), onShape})
  meter.track({sampleRate: 100, samples: new Float32Array(225).fill(0.2), text: '마오'}, 1, 2)
  clock = 1.05
  step(0)
  expect(onShape).toHaveBeenLastCalledWith('closed', expect.any(Number))
  clock = 1.2
  step(0)
  expect(onShape).toHaveBeenLastCalledWith('a', expect.any(Number))
  clock = 1.8
  step(0)
  expect(onShape).toHaveBeenLastCalledWith('o', expect.any(Number))
  meter.dispose()
})
