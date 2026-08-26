/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {createPVisemeDriver} from '../audio-driven-viseme'
import {
  createPBrowserAudioVisemeAnalyzer,
  resolvePBrowserAudioVisemeFrame,
} from '../browser-audio-viseme'

const wlipsyncMocks = vi.hoisted(() => ({
  createNode: vi.fn(),
  parseProfile: vi.fn(() => ({})),
}))

vi.mock('wlipsync', () => ({
  createWLipSyncNode: wlipsyncMocks.createNode,
  parseBinaryProfile: wlipsyncMocks.parseProfile,
}))

const createAudioHarness = () => {
  const destination = {}
  const context = {audioWorklet: {}, destination} as unknown as AudioContext
  const node = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    maxVolume: 0,
    minVolume: 0,
    smoothness: 0,
    volume: 0.8,
    weights: {A: 1},
  }
  const source = {connect: vi.fn(), disconnect: vi.fn()} as unknown as AudioNode

  vi.stubGlobal('AudioWorkletNode', class {})
  return {context, destination, node, source}
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('resolvePBrowserAudioVisemeFrame', () => {
  it.each([
    ['A', 'open'],
    ['E', 'wide'],
    ['I', 'wide'],
    ['O', 'round'],
    ['U', 'round'],
    ['S', 'narrow'],
  ] as const)('should map the %s profile to the %s mouth', (profileName, viseme) => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'rest',
        intensity: 0.8,
        weights: {[profileName]: 1},
      }),
    ).toEqual({intensity: 0.8, viseme})
  })

  it('should return to rest below the analysis volume threshold', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'wide',
        intensity: 0.05,
        weights: {I: 1},
      }),
    ).toEqual({intensity: 0.05, viseme: 'rest'})
  })

  it('should preserve a text-derived bilabial closure at low volume', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'closed',
        intensity: 0.05,
        weights: {A: 1},
      }),
    ).toEqual({intensity: 0.08, viseme: 'closed'})
  })

  it('should retain the text-guided mouth when no profile has a positive weight', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.5,
        weights: {},
      }),
    ).toEqual({intensity: 0.5, viseme: 'open'})
  })

  it('should use a narrow mouth when audio has no profile and text is resting', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'rest',
        intensity: 0.5,
        weights: {},
      }),
    ).toEqual({intensity: 0.5, viseme: 'narrow'})
  })

  it('should treat a missing text-guided profile weight as zero', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.8,
        weights: {I: 0.6},
      }),
    ).toEqual({intensity: 0.8, viseme: 'open'})
  })

  it('should retain the text-guided mouth when the audio winner is uncertain', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.8,
        weights: {A: 0.4, I: 0.6},
      }),
    ).toEqual({intensity: 0.8, viseme: 'open'})
  })

  it('should override the text-guided mouth when the audio winner is decisive', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'open',
        intensity: 0.8,
        weights: {A: 0.1, I: 0.9},
      }),
    ).toEqual({intensity: 0.8, viseme: 'wide'})
  })

  it('should preserve text-derived closure even when the audio winner is loud', () => {
    expect(
      resolvePBrowserAudioVisemeFrame({
        fallbackViseme: 'closed',
        intensity: 0.9,
        weights: {A: 1},
      }),
    ).toEqual({intensity: 0.28, viseme: 'closed'})
  })

  it('should preserve a quiet text-derived closure through the viseme driver', () => {
    const driver = createPVisemeDriver()
    const frame = resolvePBrowserAudioVisemeFrame({
      fallbackViseme: 'closed',
      intensity: 0.05,
      weights: {A: 1},
    })

    expect(driver.update({currentTimeMs: 0, ...frame})).toBe('closed')
  })
})

describe('createPBrowserAudioVisemeAnalyzer', () => {
  it('should stay inactive when AudioWorklet is unavailable', async () => {
    const source = {connect: vi.fn(), disconnect: vi.fn()} as unknown as AudioNode
    const context = {destination: {}} as unknown as AudioContext
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)

    analyzer.dispose()
    await analyzer.connect(source)

    expect(source.connect).not.toHaveBeenCalled()
    expect(analyzer.getFrame('rest')).toBeNull()
  })

  it('should stay inactive when the lip-sync node cannot initialize', async () => {
    const {context, source} = createAudioHarness()
    wlipsyncMocks.createNode.mockRejectedValue(new Error('worklet failed'))
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)

    await analyzer.connect(source)

    expect(source.connect).not.toHaveBeenCalled()
    expect(analyzer.getFrame('rest')).toBeNull()
  })

  it('should release a lip-sync node that resolves after disposal', async () => {
    const {context, node, source} = createAudioHarness()
    let resolveNode: ((value: typeof node) => void) | undefined
    wlipsyncMocks.createNode.mockReturnValue(
      new Promise((resolve) => {
        resolveNode = resolve
      }),
    )
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)
    const connection = analyzer.connect(source)

    analyzer.dispose()
    resolveNode?.(node)
    await connection

    expect(node.disconnect).toHaveBeenCalledOnce()
    expect(source.connect).not.toHaveBeenCalled()
  })

  it('should connect, read, and release an analyzed source', async () => {
    const {context, destination, node, source} = createAudioHarness()
    wlipsyncMocks.createNode.mockResolvedValue(node)
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)

    await analyzer.connect(source)

    expect(source.connect).toHaveBeenCalledWith(node)
    expect(node.connect).toHaveBeenCalledWith(destination)
    expect(analyzer.getFrame('rest')).toEqual({intensity: 0.8, viseme: 'open'})

    analyzer.disconnect(source)
    expect(source.disconnect).toHaveBeenCalledWith(node)
    expect(node.disconnect).toHaveBeenCalledWith(destination)

    analyzer.dispose()
    expect(node.disconnect).toHaveBeenCalledTimes(2)
    expect(analyzer.getFrame('rest')).toBeNull()
  })

  it('should not reconnect a source cancelled while the analyzer initializes', async () => {
    const {context, node, source} = createAudioHarness()
    let resolveNode: ((value: typeof node) => void) | undefined
    wlipsyncMocks.createNode.mockReturnValue(
      new Promise((resolve) => {
        resolveNode = resolve
      }),
    )
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)
    const connection = analyzer.connect(source)

    analyzer.disconnect(source)
    resolveNode?.(node)
    await connection

    expect(source.connect).not.toHaveBeenCalled()
  })

  it('should disconnect the worklet while idle and reconnect it for a later source', async () => {
    const {context, destination, node, source: firstSource} = createAudioHarness()
    const secondSource = {connect: vi.fn(), disconnect: vi.fn()} as unknown as AudioNode
    const laterSource = {connect: vi.fn(), disconnect: vi.fn()} as unknown as AudioNode
    wlipsyncMocks.createNode.mockResolvedValue(node)
    const analyzer = createPBrowserAudioVisemeAnalyzer(context)

    await analyzer.connect(firstSource)
    await analyzer.connect(secondSource)

    expect(node.connect).toHaveBeenCalledOnce()
    analyzer.disconnect(firstSource)
    expect(node.disconnect).not.toHaveBeenCalled()

    analyzer.disconnect(secondSource)
    expect(node.disconnect).toHaveBeenCalledWith(destination)

    await analyzer.connect(laterSource)
    expect(node.connect).toHaveBeenCalledTimes(2)
    expect(node.connect).toHaveBeenLastCalledWith(destination)

    analyzer.disconnect(laterSource)
    expect(node.disconnect).toHaveBeenCalledTimes(2)
    expect(node.disconnect).toHaveBeenLastCalledWith(destination)
  })
})
