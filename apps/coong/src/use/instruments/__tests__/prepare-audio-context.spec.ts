/** @vitest-environment jsdom */

import {getWindow} from '@winter-love/utils'
import {AudioContext as StandardizedAudioContext} from 'standardized-audio-context'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('@winter-love/utils', () => ({
  getWindow: vi.fn(),
}))

vi.mock('standardized-audio-context', () => ({
  AudioContext: vi.fn(),
}))

interface AudioContextFixture {
  audioContext: AudioContext
  buffer: AudioBuffer
  connect: ReturnType<typeof vi.fn>
  createBuffer: ReturnType<typeof vi.fn>
  createBufferSource: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

const createAudioContextFixture = (): AudioContextFixture => {
  const buffer = {} as AudioBuffer
  const connect = vi.fn()
  const start = vi.fn()
  const source = {buffer: null, connect, start}
  const createBuffer = vi.fn().mockReturnValue(buffer)
  const createBufferSource = vi.fn().mockReturnValue(source)
  const resume = vi.fn().mockResolvedValue(undefined)
  const audioContext = {
    createBuffer,
    createBufferSource,
    destination: {},
    resume,
    sampleRate: 48_000,
  } as unknown as AudioContext

  return {audioContext, buffer, connect, createBuffer, createBufferSource, resume, start}
}

const mockAudioContextConstructor = (audioContext: AudioContext) => {
  const AudioContextMock = class {
    constructor() {
      // eslint-disable-next-line no-constructor-return
      return audioContext
    }
  }

  vi.mocked(StandardizedAudioContext).mockImplementation(
    AudioContextMock as unknown as typeof StandardizedAudioContext,
  )
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('prepareAudioContext', () => {
  it('should return an inert cleanup when a window is unavailable', async () => {
    vi.mocked(getWindow).mockReturnValue(null)
    const {getAudioContext, prepareAudioContext} = await import('../prepare-audio-context')
    const listener = vi.fn()

    const cleanup = prepareAudioContext(listener)

    expect(getAudioContext()).toBeUndefined()
    expect(listener).not.toHaveBeenCalled()
    expect(() => cleanup()).not.toThrow()
  })

  it('should activate once, notify subscribed listeners, and reuse the context', async () => {
    const fixture = createAudioContextFixture()
    mockAudioContextConstructor(fixture.audioContext)
    vi.mocked(getWindow).mockReturnValue(window)
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const {getAudioContext, prepareAudioContext} = await import('../prepare-audio-context')
    const retainedListener = vi.fn()
    const removedListener = vi.fn()

    prepareAudioContext(retainedListener)
    const removeSubscription = prepareAudioContext(removedListener)
    removeSubscription()

    expect(addEventListener).toHaveBeenCalledTimes(3)
    expect(addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), {
      capture: true,
      passive: true,
    })

    window.dispatchEvent(new Event('pointerdown'))

    expect(StandardizedAudioContext).toHaveBeenCalledOnce()
    expect(fixture.resume).toHaveBeenCalledOnce()
    expect(fixture.createBufferSource).toHaveBeenCalledOnce()
    expect(fixture.createBuffer).toHaveBeenCalledWith(1, 1, 48_000)
    expect(fixture.connect).toHaveBeenCalledWith(fixture.audioContext.destination)
    expect(fixture.start).toHaveBeenCalledWith(0)
    expect(retainedListener).toHaveBeenCalledWith(fixture.audioContext)
    expect(removedListener).not.toHaveBeenCalled()
    expect(removeEventListener).toHaveBeenCalledTimes(3)
    expect(getAudioContext()).toBe(fixture.audioContext)

    const cachedListener = vi.fn()
    const cachedCleanup = prepareAudioContext(cachedListener)

    expect(cachedListener).toHaveBeenCalledWith(fixture.audioContext)
    expect(StandardizedAudioContext).toHaveBeenCalledOnce()
    expect(() => cachedCleanup()).not.toThrow()
  })

  it('should absorb a rejected resume while completing activation', async () => {
    const fixture = createAudioContextFixture()
    fixture.resume.mockRejectedValue(new Error('blocked'))
    mockAudioContextConstructor(fixture.audioContext)
    vi.mocked(getWindow).mockReturnValue(window)
    const {prepareAudioContext} = await import('../prepare-audio-context')
    const listener = vi.fn()

    prepareAudioContext(listener)
    window.dispatchEvent(new KeyboardEvent('keydown'))
    await Promise.resolve()

    expect(listener).toHaveBeenCalledWith(fixture.audioContext)
  })
})
