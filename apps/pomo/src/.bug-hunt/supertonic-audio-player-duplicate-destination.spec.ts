/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const analyzerMocks = vi.hoisted(() => ({
  connect: vi.fn<(source: AudioNode) => Promise<void>>(),
  create: vi.fn(),
  disconnect: vi.fn(),
  dispose: vi.fn(),
  getFrame: vi.fn(),
}))

vi.mock('../features/lip-sync/browser-audio-viseme', () => ({
  createPBrowserAudioVisemeAnalyzer: analyzerMocks.create,
}))

import {createSupertonicAudioPlayer} from '../features/supertonic/audio-player'

interface AudioSourceHarness {
  readonly connect: ReturnType<typeof vi.fn>
}

interface AudioRuntimeHarness {
  readonly destination: object
  readonly sources: Array<AudioSourceHarness>
}

const installAudioRuntime = (): AudioRuntimeHarness => {
  const runtime: AudioRuntimeHarness = {
    destination: {},
    sources: [],
  }

  class AudioContextMock {
    readonly destination = runtime.destination
    currentTime = 0

    close = vi.fn(async () => undefined)
    createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => ({
      copyToChannel: vi.fn(),
      duration: length / sampleRate,
    }))
    createBufferSource = () => {
      const source = {
        addEventListener: vi.fn(),
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      runtime.sources.push({connect: source.connect})
      return source
    }

    resume = vi.fn(async () => undefined)
  }

  vi.stubGlobal('AudioContext', AudioContextMock)
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined)
  return runtime
}

beforeEach(() => {
  analyzerMocks.connect.mockReset().mockResolvedValue(undefined)
  analyzerMocks.create.mockReset().mockReturnValue({
    connect: analyzerMocks.connect,
    disconnect: analyzerMocks.disconnect,
    dispose: analyzerMocks.dispose,
    getFrame: analyzerMocks.getFrame,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createSupertonicAudioPlayer destination routing', () => {
  it('should route playback through the viseme analyzer instead of duplicating destination output', async () => {
    const runtime = installAudioRuntime()
    const player = createSupertonicAudioPlayer({onVisemeChange: vi.fn()})

    player.enqueue(
      {generationTime: 1, sampleRate: 1_000, samples: new Float32Array(100).fill(0.25)},
      0,
      '안녕',
    )

    await Promise.resolve()

    const source = runtime.sources[0]
    expect(source).toBeDefined()
    expect(analyzerMocks.connect).toHaveBeenCalledOnce()
    expect(source!.connect).not.toHaveBeenCalledWith(runtime.destination)
  })
})
