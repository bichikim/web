import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type FocusRoomAudioVisualizer,
  useFocusRoomAudioVisualizer,
} from '../use-focus-room-audio-visualizer'

describe('useFocusRoomAudioVisualizer', () => {
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
    const context = {
      close: vi.fn().mockResolvedValue(undefined),
      createAnalyser: vi.fn(() => analyser),
      createMediaElementSource: vi.fn(() => source),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      state: 'running',
    }
    const cancelFrame = vi.fn()
    const requestFrame = vi.fn(() => 1)
    const AudioContextMock = vi.fn(function AudioContextMock() {
      return context
    })
    vi.stubGlobal('AudioContext', AudioContextMock)
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
    vi.stubGlobal('requestAnimationFrame', requestFrame)

    let dispose: () => void = () => undefined
    let visualizer: FocusRoomAudioVisualizer | undefined
    createRoot((rootDispose) => {
      dispose = rootDispose
      visualizer = useFocusRoomAudioVisualizer()
    })

    visualizer?.start(document.createElement('audio'))
    await Promise.resolve()

    expect(visualizer?.levels()).toEqual(Array.from({length: 24}, () => 100))
    expect(requestFrame).toHaveBeenCalledOnce()

    visualizer?.stop()
    expect(visualizer?.levels()[0]).toBe(18)
    expect(cancelFrame).toHaveBeenCalledWith(1)

    dispose()
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(analyser.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
  })
})
