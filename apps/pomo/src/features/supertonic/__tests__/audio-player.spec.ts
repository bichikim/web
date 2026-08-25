/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const analyzerMocks = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  create: vi.fn(),
  disconnect: vi.fn(),
  dispose: vi.fn(),
  getFrame: vi.fn(),
}))

vi.mock('../../lip-sync/browser-audio-viseme', () => ({
  createPBrowserAudioVisemeAnalyzer: analyzerMocks.create,
}))

import {createSupertonicAudioPlayer} from '../audio-player'

interface AudioSourceHarness {
  readonly disconnect: ReturnType<typeof vi.fn>
  readonly end: () => void
}

interface AudioRuntimeHarness {
  readonly close: ReturnType<typeof vi.fn>
  currentTime: number
  readonly frames: Array<FrameRequestCallback>
  rejectClose: boolean
  rejectResume: boolean
  readonly resume: ReturnType<typeof vi.fn>
  readonly sources: Array<AudioSourceHarness>
}

const installAudioRuntime = () => {
  const runtime: AudioRuntimeHarness = {
    close: vi.fn(),
    currentTime: 0,
    frames: [],
    rejectClose: false,
    rejectResume: false,
    resume: vi.fn(),
    sources: [],
  }

  class AudioContextMock {
    readonly destination = {}
    state = 'running'

    get currentTime() {
      return runtime.currentTime
    }

    close = runtime.close.mockImplementation(async () => {
      if (runtime.rejectClose) {
        throw new Error('close failed')
      }

      this.state = 'closed'
    })

    createBuffer(_channels: number, length: number, sampleRate: number) {
      return {copyToChannel: vi.fn(), duration: length / sampleRate}
    }

    createBufferSource() {
      let onEnded: () => void = () => undefined
      const source = {
        addEventListener: (_event: string, callback: () => void) => {
          onEnded = callback
        },
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      runtime.sources.push({disconnect: source.disconnect, end: () => onEnded()})
      return source
    }

    resume = runtime.resume.mockImplementation(async () => {
      if (runtime.rejectResume) {
        throw new Error('resume failed')
      }
    })
  }

  vi.stubGlobal('AudioContext', AudioContextMock)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    runtime.frames.push(callback)
    return runtime.frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  return runtime
}

beforeEach(() => {
  analyzerMocks.connect.mockReset().mockResolvedValue(undefined)
  analyzerMocks.disconnect.mockReset()
  analyzerMocks.dispose.mockReset()
  analyzerMocks.getFrame.mockReset().mockReturnValue(null)
  analyzerMocks.create.mockReset().mockReturnValue({
    connect: analyzerMocks.connect,
    disconnect: analyzerMocks.disconnect,
    dispose: analyzerMocks.dispose,
    getFrame: analyzerMocks.getFrame,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createSupertonicAudioPlayer', () => {
  it('should hold the speaking mouth until playback ends and return to rest after 300ms', () => {
    vi.useFakeTimers()
    const runtime = installAudioRuntime()
    const onPlaybackEnd = vi.fn()
    const onVisemeChange = vi.fn()
    const player = createSupertonicAudioPlayer({onPlaybackEnd, onVisemeChange})

    player.enqueue(
      {generationTime: 1, sampleRate: 1_000, samples: new Float32Array(500).fill(0.5)},
      0,
      '아',
    )
    runtime.frames.shift()?.(0)

    expect(onVisemeChange).toHaveBeenLastCalledWith('narrow')

    runtime.currentTime = 0.1
    runtime.frames.shift()?.(100)
    expect(onVisemeChange).toHaveBeenLastCalledWith('narrow')

    runtime.currentTime = 0.15
    runtime.frames.shift()?.(150)
    expect(onVisemeChange).toHaveBeenLastCalledWith('open')

    runtime.currentTime = 0.6
    runtime.frames.shift()?.(600)
    expect(onVisemeChange).toHaveBeenLastCalledWith('open')

    player.finish()
    runtime.sources[0]?.end()
    runtime.frames.shift()?.(600)

    expect(onPlaybackEnd).toHaveBeenCalledOnce()
    expect(runtime.sources[0]?.disconnect).toHaveBeenCalledOnce()
    expect(onVisemeChange).toHaveBeenLastCalledWith('open')
    vi.advanceTimersByTime(299)
    expect(onVisemeChange).toHaveBeenLastCalledWith('open')
    vi.advanceTimersByTime(1)
    expect(onVisemeChange).toHaveBeenLastCalledWith('rest')
  })

  it('should stop the viseme clock when disposed', () => {
    const runtime = installAudioRuntime()
    const onVisemeChange = vi.fn()
    const player = createSupertonicAudioPlayer({onVisemeChange})

    player.enqueue(
      {generationTime: 1, sampleRate: 1_000, samples: new Float32Array(500).fill(0.5)},
      0,
      '오',
    )
    runtime.frames.shift()?.(0)
    player.dispose()

    expect(window.cancelAnimationFrame).toHaveBeenCalled()
    expect(onVisemeChange).toHaveBeenLastCalledWith('rest')
  })

  it('should ignore delayed source endings after disposal', () => {
    const runtime = installAudioRuntime()
    const onPlaybackEnd = vi.fn()
    const player = createSupertonicAudioPlayer({onPlaybackEnd})

    player.enqueue(
      {generationTime: 1, sampleRate: 1_000, samples: new Float32Array(500).fill(0.5)},
      0,
      '아',
    )
    player.finish()
    player.dispose()
    runtime.sources[0]?.end()

    expect(onPlaybackEnd).not.toHaveBeenCalled()
  })

  it('should cancel a pending rest return and skip closing an already closed context', () => {
    vi.useFakeTimers()
    const runtime = installAudioRuntime()
    const clearTimeout = vi.spyOn(window, 'clearTimeout')
    const player = createSupertonicAudioPlayer()

    player.finish()
    player.dispose()

    expect(clearTimeout).toHaveBeenCalledOnce()
    expect(runtime.close).toHaveBeenCalledOnce()
  })

  it('should isolate rejected resume, analyzer connection, and context close operations', async () => {
    const runtime = installAudioRuntime()
    runtime.rejectClose = true
    runtime.rejectResume = true
    analyzerMocks.connect.mockRejectedValue(new Error('analyzer unavailable'))
    const player = createSupertonicAudioPlayer()

    player.enqueue(
      {generationTime: 1, sampleRate: 1_000, samples: new Float32Array(500).fill(0.5)},
      0,
    )
    player.finish()
    runtime.sources[0]?.end()
    player.dispose()
    await Promise.resolve()
    await Promise.resolve()

    expect(runtime.resume).toHaveBeenCalledOnce()
    expect(analyzerMocks.connect).toHaveBeenCalledOnce()
    expect(runtime.close).toHaveBeenCalledTimes(2)
  })

  it('should keep the current rest viseme when a silent frame is analyzed', () => {
    const runtime = installAudioRuntime()
    const onVisemeChange = vi.fn()
    const player = createSupertonicAudioPlayer({onVisemeChange})

    player.enqueue({generationTime: 1, sampleRate: 1_000, samples: new Float32Array(500)}, 0)
    runtime.frames.shift()?.(0)

    expect(onVisemeChange).not.toHaveBeenCalled()
  })
})
