import {afterEach, expect, it, vi} from 'vitest'
import {analyzeSpeechFrame} from '../analyze-speech-frame'
import {createPlaybackMeter} from '../create-playback-meter'

it('should announce only the clip on the audio clock and retain queued clip identity while paused', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 0
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn()})
  const first = vi.fn()
  const next = vi.fn()
  const audio = {sampleRate: 100, samples: new Float32Array(100)}
  meter.track(audio, 1, 1, first)
  meter.track(audio, 2, 1, next)
  step(0)
  expect(first).not.toHaveBeenCalled()
  clock = 1.5
  step(0)
  step(0)
  expect(first).toHaveBeenCalledOnce()
  expect(next).not.toHaveBeenCalled()
  meter.setPaused(true)
  step(0)
  expect(next).not.toHaveBeenCalled()
  meter.setPaused(false)
  clock = 2.1
  step(0)
  expect(next).toHaveBeenCalledOnce()
  meter.dispose()
})

it('should seal voiced bilabials and preserve loudness and opening outside their transition', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.mocked(analyzeSpeechFrame).mockReturnValue({a: 1})
  let clock = 0
  const onLevel = vi.fn()
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel, onShape})
  meter.track(
    {
      sampleRate: 16000,
      samples: new Float32Array(16000).fill(0.1),
      shapeCues: [
        {end: 0.3, shape: 'a', start: 0.1},
        {end: 0.36, shape: 'closed', start: 0.3},
        {end: 0.7, shape: 'o', start: 0.36},
      ],
    },
    0,
    1,
  )
  for (const time of [0.2, 0.285, 0.32, 0.42]) {
    clock = time
    step(0)
    expect(onLevel.mock.lastCall![0]).toBeCloseTo(0.6 * (1 - Math.exp(-time / 0.035)))
    const opening = onShape.mock.lastCall![3].openingWeights
    if (time === 0.32) {
      expect(opening).toEqual({a: 0, closed: 1, e: 0, i: 0, o: 0, u: 0})
    } else if (time === 0.285) {
      expect(opening.closed).toBeGreaterThan(0)
      expect(opening.closed).toBeLessThan(1)
    } else {
      expect(opening.a).toBeCloseTo(1 - Math.exp(-time / 0.06))
      expect(opening.closed).toBe(0)
    }
  }
  meter.setPaused(true)
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
  meter.dispose()
})

it('should keep a form-only tail on natural completion and cancel every frame on interruption', () => {
  let clock = 0
  let sequence = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    sequence += 1
    frames.set(sequence, callback)
    return sequence
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.mocked(analyzeSpeechFrame).mockReturnValue({o: 1})
  const onLevel = vi.fn()
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel, onShape})
  const stop = meter.track(
    {
      sampleRate: 16000,
      samples: new Float32Array(9600).fill(0.1),
      shapeCues: [{end: 0.6, shape: 'o', start: 0}],
    },
    0,
    1,
  )
  const draw = () => {
    const pending = [...frames.values()]
    frames.clear()
    pending.forEach((callback) => callback(clock * 1000))
  }
  clock = 0.59
  draw()
  clock = 0.6
  stop('ended')
  draw()
  expect(onLevel).toHaveBeenLastCalledWith(0)
  expect(onShape.mock.lastCall!.slice(1)).toEqual([
    0,
    {o: 1},
    {motion: {phase: 'hold', weight: 1}, openingWeights: {}},
  ])
  clock = 0.74
  draw()
  expect(onShape.mock.lastCall![3].motion.phase).toBe('release')
  meter.stop()
  expect(frames.size).toBe(0)
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
})

it('should correct vowel form from prepared cues without changing acoustic opening or loudness', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.mocked(analyzeSpeechFrame).mockReturnValue({e: 1})
  let clock = 0
  const onShape = vi.fn()
  const onLevel = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel, onShape})
  meter.track(
    {
      sampleRate: 16000,
      samples: new Float32Array(16000).fill(0.1),
      shapeCues: [{end: 1, shape: 'a', start: 0}],
    },
    0,
    1,
  )
  clock = 0.04
  step(0)
  const [shape, level, weights, opening] = onShape.mock.lastCall!
  expect(shape).toBe('a')
  expect(weights.a).toBeGreaterThan(0.7)
  expect(opening.openingWeights).toEqual(
    expect.objectContaining({e: expect.closeTo(1 - Math.exp(-0.04 / 0.06))}),
  )
  expect(level).toBeCloseTo(0.6 * (1 - Math.exp(-0.04 / 0.035)))
  expect(onLevel).toHaveBeenLastCalledWith(level)
  meter.dispose()
})
it('should reveal the next vowel within forty milliseconds while retaining the old opening response', () => {
  let step: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.mocked(analyzeSpeechFrame).mockReturnValue({i: 1})
  let clock = 0
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel: vi.fn(), onShape})
  meter.track(
    {
      sampleRate: 16000,
      samples: new Float32Array(16000).fill(0.1),
      shapeCues: [
        {end: 0.06, shape: 'i', start: 0},
        {end: 1, shape: 'o', start: 0.06},
      ],
    },
    0,
    1,
  )
  clock = 0.04
  step(0)
  clock = 0.08
  step(0)
  expect(onShape.mock.lastCall![0]).toBe('o')
  expect(onShape.mock.lastCall![2].o).toBeGreaterThan(0.75)
  expect(onShape.mock.lastCall![3].openingWeights.i).toBeCloseTo(1 - Math.exp(-0.08 / 0.06))
  meter.dispose()
})

it('should close the mouth while paused and retain clips for resumed playback', () => {
  let step: FrameRequestCallback = () => undefined
  const schedule = vi.fn((callback: FrameRequestCallback) => {
    step = callback
    return 1
  })
  vi.stubGlobal('requestAnimationFrame', schedule)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let clock = 0
  const onLevel = vi.fn()
  const onShape = vi.fn()
  const meter = createPlaybackMeter({clock: () => clock, onLevel, onShape})
  const audio = {sampleRate: 100, samples: new Float32Array(100).fill(0.2)}
  meter.track(audio, 0, 1)
  clock = 0.1
  step(0)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(0)
  meter.setPaused(true)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  expect(onShape).toHaveBeenLastCalledWith(null, 0)
  schedule.mockClear()
  meter.track(audio, 1, 1)
  expect(schedule).not.toHaveBeenCalled()
  meter.setPaused(false)
  expect(schedule).toHaveBeenCalledOnce()
  clock = 0.2
  step(0)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(0)
  meter.dispose()
})

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
    expect.objectContaining({
      openingWeights: expect.objectContaining({o: expect.closeTo(1 - Math.exp(-1.1 / 0.06))}),
    }),
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
    expect.objectContaining({openingWeights: expect.objectContaining({closed: 0})}),
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
