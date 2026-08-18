import {afterEach, describe, expect, it, vi} from 'vitest'

import {createBrowserSpeechEndDetector, createSpeechEndState} from '../speech-end-detector'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createSpeechEndState', () => {
  it('should ignore an isolated noise spike', () => {
    const state = createSpeechEndState()

    expect(state.push({energy: 0.02, timestamp: 0})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_000})).toBe(false)
  })

  it('should emit once after sustained speech followed by 800ms of silence', () => {
    const state = createSpeechEndState()

    expect(state.push({energy: 0.02, timestamp: 0})).toBe(false)
    expect(state.push({energy: 0.02, timestamp: 50})).toBe(false)
    expect(state.push({energy: 0.02, timestamp: 100})).toBe(false)
    expect(state.push({energy: 0, timestamp: 899})).toBe(false)
    expect(state.push({energy: 0, timestamp: 900})).toBe(true)
    expect(state.push({energy: 0, timestamp: 1_800})).toBe(false)
  })

  it('should treat low speech energy as activity before declaring an endpoint', () => {
    const state = createSpeechEndState()

    state.push({energy: 0.02, timestamp: 0})
    state.push({energy: 0.02, timestamp: 50})
    state.push({energy: 0.02, timestamp: 100})
    expect(state.push({energy: 0.012, timestamp: 700})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_499})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_500})).toBe(true)
  })
})

describe('createBrowserSpeechEndDetector', () => {
  it('should return null when Web Audio is unavailable or cannot initialize', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(createBrowserSpeechEndDetector({} as MediaStream)).toBeNull()

    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContextMock() {
        throw new Error('audio unavailable')
      }),
    )
    expect(createBrowserSpeechEndDetector({} as MediaStream)).toBeNull()
  })

  it('should notify subscribers after speech ends and release browser audio resources', async () => {
    const energies = [0.02, 0.02, 0.02, 0]
    const timestamps = [0, 50, 100, 900]
    const analyser = {
      disconnect: vi.fn(),
      fftSize: 0,
      getFloatTimeDomainData: vi.fn((samples: Float32Array) => {
        samples.fill(energies.shift() ?? 0)
      }),
    }
    const source = {connect: vi.fn(), disconnect: vi.fn()}
    const context = {
      close: vi.fn().mockRejectedValue(new Error('close failed')),
      createAnalyser: vi.fn(() => analyser),
      createMediaStreamSource: vi.fn(() => source),
      resume: vi.fn().mockRejectedValue(new Error('resume failed')),
    }
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContextMock() {
        return context
      }),
    )
    vi.spyOn(performance, 'now').mockImplementation(() => timestamps.shift() ?? 900)
    const setInterval = vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      const run = callback as () => void
      run()
      run()
      run()
      run()
      return 17 as unknown as ReturnType<typeof window.setInterval>
    })
    const clearInterval = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined)

    const detector = createBrowserSpeechEndDetector({} as MediaStream)
    const listener = vi.fn()
    const unsubscribe = detector?.subscribe(listener)

    expect(setInterval).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()

    energies.push(0.02, 0.02, 0.02, 0)
    timestamps.push(1_000, 1_050, 1_100, 1_900)
    const intervalCallback = setInterval.mock.calls[0]?.[0] as () => void
    intervalCallback()
    intervalCallback()
    intervalCallback()
    intervalCallback()
    expect(listener).toHaveBeenCalledOnce()

    expect(unsubscribe?.()).toBe(true)
    detector?.dispose()
    await Promise.resolve()

    expect(clearInterval).toHaveBeenCalledWith(17)
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(analyser.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
  })
})
