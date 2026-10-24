import {afterEach, describe, expect, test, vi} from 'vitest'

import {connectVoiceMouthShapes} from '../connect-voice'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('connectVoiceMouthShapes', () => {
  test('should analyze each animation frame and fade the shapes out on disconnect', () => {
    const frames: Array<() => void> = []
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const analyser = {
      context: {sampleRate: 16_000},
      fftSize: 0,
      getFloatTimeDomainData: vi.fn(),
    }
    const source = {
      connect: vi.fn(),
      context: {createAnalyser: () => analyser},
      disconnect: vi.fn(),
    }
    const player = {setVowelWeights: vi.fn()}
    const disconnect = connectVoiceMouthShapes({
      player,
      source: source as unknown as AudioNode,
    })
    expect(source.connect).toHaveBeenCalledWith(analyser)
    frames.shift()?.()
    // Silent buffers analyze to zero weights.
    expect(player.setVowelWeights).toHaveBeenLastCalledWith({a: 0, e: 0, i: 0, o: 0, u: 0})
    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(1)
    disconnect()
    expect(source.disconnect).toHaveBeenCalledWith(analyser)
    expect(player.setVowelWeights).toHaveBeenLastCalledWith(undefined)
  })

  test('should close the mouth even when the app already disconnected the source', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const analyser = {context: {sampleRate: 16_000}, fftSize: 0, getFloatTimeDomainData: vi.fn()}
    const source = {
      connect: vi.fn(),
      context: {createAnalyser: () => analyser},
      // Like Chromium after the app's own `source.disconnect()`.
      disconnect: vi.fn(() => {
        throw new DOMException('not connected', 'InvalidAccessError')
      }),
    }
    const player = {setVowelWeights: vi.fn()}
    const disconnect = connectVoiceMouthShapes({player, source: source as unknown as AudioNode})
    expect(() => disconnect()).not.toThrow()
    expect(() => disconnect()).not.toThrow()
    expect(player.setVowelWeights).toHaveBeenLastCalledWith(undefined)
    expect(source.disconnect).toHaveBeenCalledOnce()
  })
})
