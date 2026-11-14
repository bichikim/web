import {afterEach, expect, it, vi} from 'vitest'
import {analyzeSpeechFrame} from '../analyze-speech-frame'
import {createPlaybackMeter} from '../create-playback-meter'

vi.mock('../analyze-speech-frame', () => ({analyzeSpeechFrame: vi.fn(() => ({}))}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(analyzeSpeechFrame).mockReset()
})
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

it('should publish acoustic weights against the playback clock instead of matching transcript letters', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 0
  const onShape = vi.fn()
  vi.mocked(analyzeSpeechFrame).mockReturnValue({o: 1})
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn(), onShape})
  const audio = {sampleRate: 16000, samples: new Float32Array(32000).fill(0.2), text: '마음 이이이'}
  const stop = meter.track(audio, 1, 2)
  step(0)
  expect(analyzeSpeechFrame).not.toHaveBeenCalled()
  clock = 1.1
  step(0)
  expect(analyzeSpeechFrame).toHaveBeenLastCalledWith(audio, expect.closeTo(0.2))
  expect(onShape).toHaveBeenLastCalledWith(
    'o',
    expect.any(Number),
    expect.objectContaining({o: expect.closeTo(1 - Math.exp(-1.1 / 0.06))}),
  )
  // Same analysis bucket: another rendered frame reuses its acoustic result.
  clock = 1.105
  step(0)
  expect(analyzeSpeechFrame).toHaveBeenCalledOnce()
  vi.mocked(analyzeSpeechFrame).mockReturnValue({i: 1})
  clock = 1.12
  step(0)
  const weights = onShape.mock.lastCall![2]
  expect(weights.o).toBeGreaterThan(0)
  expect(weights.i).toBeGreaterThan(0)
  expect(weights.i).toBeLessThan(1)
  stop()
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
  meter.dispose()
})
it('should keep unclassified voiced audio neutral instead of inserting transcript closures', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.mocked(analyzeSpeechFrame).mockReturnValue({})
  let clock = 0
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn(), onShape})
  meter.track({sampleRate: 16000, samples: new Float32Array(16000).fill(0.2), text: '마음'}, 0, 1)
  clock = 0.1
  step(0)
  expect(onShape).toHaveBeenLastCalledWith(
    null,
    expect.any(Number),
    expect.objectContaining({closed: 0}),
  )
  expect(onShape.mock.lastCall![1]).toBeGreaterThan(0.8)
  meter.dispose()
})
it('should stop acoustic analysis while lip sync is disabled and resume on the current audio frame', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let enabled = false
  let clock = 0
  const onShape = vi.fn()
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  const meter = createPlaybackMeter({
    clock: () => clock,
    enabled: () => enabled,
    onLevel: vi.fn(),
    onShape,
  })
  meter.track({sampleRate: 16000, samples: new Float32Array(16000).fill(0.2)}, 0, 1)
  clock = 0.1
  step(0)
  expect(analyzeSpeechFrame).not.toHaveBeenCalled()
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
  enabled = true
  clock = 0.2
  step(0)
  expect(analyzeSpeechFrame).toHaveBeenCalledOnce()
  expect(onShape.mock.lastCall![0]).toBe('a')
  meter.dispose()
})
