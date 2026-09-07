import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {type PAudioVisualizer, usePAudioVisualizer} from '../use-focus-room-audio-visualizer'

interface AudioHarnessOptions {
  readonly close?: () => Promise<void>
  readonly resume?: () => Promise<void>
  readonly spectrumValue?: number
  readonly state?: AudioContextState
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const installAudioHarness = (options: AudioHarnessOptions = {}) => {
  const analyser = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 0,
    frequencyBinCount: 24,
    getByteFrequencyData: vi.fn((spectrum: Uint8Array) =>
      spectrum.fill(options.spectrumValue ?? 0),
    ),
    smoothingTimeConstant: 0,
  }
  const source = {connect: vi.fn(), disconnect: vi.fn()}
  const outputGain = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {setTargetAtTime: vi.fn(), value: 1},
  }
  let contextState = options.state ?? 'running'
  const close = vi.fn(options.close ?? (() => Promise.resolve()))
  const resume = vi.fn(async () => {
    await (options.resume?.() ?? Promise.resolve())
    contextState = 'running'
  })
  const context = {
    close,
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => outputGain),
    createMediaElementSource: vi.fn(() => source),
    currentTime: 2,
    destination: {},
    resume,
    get state() {
      return contextState
    },
  }
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  const cancelAnimationFrame = vi.fn((frame: number) => {
    callbacks.delete(frame)
  })
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const frame = nextFrame
    nextFrame += 1
    callbacks.set(frame, callback)
    return frame
  })
  const AudioContextMock = vi.fn(function AudioContextMock() {
    return context
  })
  vi.stubGlobal('AudioContext', AudioContextMock)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)

  return {
    analyser,
    AudioContextMock,
    cancelAnimationFrame,
    close,
    context,
    outputGain,
    requestAnimationFrame,
    resume,
    source,
  }
}

const createVisualizer = () =>
  createRoot((dispose) => ({dispose, visualizer: usePAudioVisualizer()}))

describe('usePAudioVisualizer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should update levels while playing and release audio resources on cleanup', async () => {
    const analyser = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      fftSize: 0,
      frequencyBinCount: 24,
      getByteFrequencyData: vi.fn((spectrum: Uint8Array) => spectrum.fill(255)),
      smoothingTimeConstant: 0,
    }
    const source = {connect: vi.fn(), disconnect: vi.fn()}
    const outputGain = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {setTargetAtTime: vi.fn(), value: 1},
    }
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      createAnalyser: vi.fn(() => analyser),
      createGain: vi.fn(() => outputGain),
      createMediaElementSource: vi.fn(() => source),
      currentTime: 0,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'running',
    }
    const cancelFrame = vi.fn()
    let scheduledFrame: FrameRequestCallback | undefined
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      scheduledFrame = callback
      return 1
    })
    const AudioContextMock = vi.fn(function AudioContextMock() {
      return context
    })
    vi.stubGlobal('AudioContext', AudioContextMock)
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
    vi.stubGlobal('requestAnimationFrame', requestFrame)

    let dispose: () => void = () => undefined
    let visualizer: PAudioVisualizer | undefined
    createRoot((rootDispose) => {
      dispose = rootDispose
      visualizer = usePAudioVisualizer()
    })

    visualizer?.start(document.createElement('audio'))
    await Promise.resolve()

    expect(visualizer?.levels()).toEqual(Array.from({length: 24}, () => 100))
    expect(requestFrame).toHaveBeenCalledOnce()

    visualizer?.stop()
    expect(visualizer?.levels()[0]).toBe(18)
    expect(cancelFrame).toHaveBeenCalledWith(1)

    scheduledFrame?.(0)
    expect(requestFrame).toHaveBeenCalledOnce()

    dispose()
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(analyser.disconnect).toHaveBeenCalledOnce()
    expect(outputGain.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('should resume a suspended context, reuse its graph, and cancel active frames on cleanup', async () => {
    const harness = installAudioHarness({
      close: () => Promise.reject(new Error('close failed')),
      spectrumValue: 0,
      state: 'suspended',
    })
    const {dispose, visualizer} = createVisualizer()

    visualizer.start(document.createElement('audio'))
    await flushMicrotasks()

    expect(harness.resume).toHaveBeenCalledOnce()
    expect(visualizer.levels()).toEqual(Array.from({length: 24}, () => 12))

    visualizer.start(document.createElement('audio'))
    await flushMicrotasks()

    expect(harness.AudioContextMock).toHaveBeenCalledOnce()
    expect(harness.context.createAnalyser).toHaveBeenCalledOnce()
    expect(harness.context.createGain).toHaveBeenCalledOnce()
    expect(harness.context.createMediaElementSource).toHaveBeenCalledOnce()
    expect(harness.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(harness.requestAnimationFrame).toHaveBeenCalledTimes(2)

    dispose()
    expect(harness.cancelAnimationFrame).toHaveBeenCalledWith(2)
    expect(harness.source.disconnect).toHaveBeenCalledOnce()
    expect(harness.analyser.disconnect).toHaveBeenCalledOnce()
    expect(harness.outputGain.disconnect).toHaveBeenCalledOnce()
    expect(harness.close).toHaveBeenCalledOnce()
    await flushMicrotasks()
  })

  it('should apply the latest output gain without changing the media element volume', async () => {
    const harness = installAudioHarness()
    const {dispose, visualizer} = createVisualizer()
    const audio = document.createElement('audio')

    visualizer.setOutputGain(0.35)
    visualizer.start(audio)
    await flushMicrotasks()

    expect(harness.outputGain.gain.value).toBe(0.35)
    expect(audio.volume).toBe(1)

    visualizer.setOutputGain(0.8)

    expect(harness.outputGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 2, 0.03)
    expect(audio.volume).toBe(1)
    dispose()
  })

  it('should not begin sampling when stopped before suspended initialization completes', async () => {
    let resolveResume: () => void = () => undefined
    const resumePromise = new Promise<void>((resolve) => {
      resolveResume = resolve
    })
    const harness = installAudioHarness({
      resume: () => resumePromise,
      state: 'suspended',
    })
    const {dispose, visualizer} = createVisualizer()

    visualizer.start(document.createElement('audio'))
    visualizer.stop()
    resolveResume()
    await flushMicrotasks()

    expect(harness.requestAnimationFrame).not.toHaveBeenCalled()
    expect(visualizer.levels()[0]).toBe(18)
    dispose()
  })

  it('should ignore initialization completion after disposal', async () => {
    let resolveResume: () => void = () => undefined
    const resumePromise = new Promise<void>((resolve) => {
      resolveResume = resolve
    })
    const harness = installAudioHarness({
      resume: () => resumePromise,
      state: 'suspended',
    })
    const {dispose, visualizer} = createVisualizer()

    visualizer.start(document.createElement('audio'))
    dispose()
    resolveResume()
    await flushMicrotasks()

    expect(harness.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('should preserve disposed state when initialization rejects after cleanup', async () => {
    const harness = installAudioHarness({
      resume: () => Promise.reject(new Error('resume failed')),
      state: 'suspended',
    })
    const {dispose, visualizer} = createVisualizer()

    visualizer.start(document.createElement('audio'))
    dispose()
    await flushMicrotasks()

    expect(harness.requestAnimationFrame).not.toHaveBeenCalled()
    expect(visualizer.levels()[0]).toBe(18)
  })
})
