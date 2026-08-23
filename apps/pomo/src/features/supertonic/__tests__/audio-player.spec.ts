/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {createSupertonicAudioPlayer} from '../audio-player'

interface AudioSourceHarness {
  readonly end: () => void
}

interface AudioRuntimeHarness {
  currentTime: number
  readonly frames: Array<FrameRequestCallback>
  readonly sources: Array<AudioSourceHarness>
}

const installAudioRuntime = () => {
  const runtime: AudioRuntimeHarness = {currentTime: 0, frames: [], sources: []}

  class AudioContextMock {
    readonly destination = {}
    state = 'running'

    get currentTime() {
      return runtime.currentTime
    }

    close = vi.fn(async () => {
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
        start: vi.fn(),
        stop: vi.fn(),
      }
      runtime.sources.push({end: () => onEnded()})
      return source
    }

    resume = vi.fn(async () => undefined)
  }

  vi.stubGlobal('AudioContext', AudioContextMock)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    runtime.frames.push(callback)
    return runtime.frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  return runtime
}

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

    expect(onPlaybackEnd).toHaveBeenCalledOnce()
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
})
