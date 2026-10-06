/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readAudioDuration} from '..'

const createAudio = () => {
  const audio = Object.assign(new EventTarget(), {
    load: vi.fn(),
    preload: '',
    removeAttribute: vi.fn(),
    src: '',
  })
  const readDuration = vi.fn(() => 60.6)
  Object.defineProperty(audio, 'duration', {get: readDuration})
  const delivered = vi.fn()
  const addListener = audio.addEventListener.bind(audio)
  const subscriptions = vi
    .spyOn(audio, 'addEventListener')
    .mockImplementation((event, listener, options) => {
      if (listener !== null) {
        addListener(
          event,
          (notification) => {
            delivered(notification.type)
            if (typeof listener === 'function') {
              listener.call(audio, notification)
            } else {
              listener.handleEvent(notification)
            }
          },
          options,
        )
      }
    })
  const createElement = vi.fn(() => audio)
  vi.stubGlobal('document', {createElement})
  return {audio, createElement, delivered, readDuration, subscriptions}
}

let capture: ReturnType<typeof createAudio>
const source = new Blob(['audio'], {type: 'audio/wav'})

beforeEach(() => {
  capture = createAudio()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const expectReleased = () => {
  expect(capture.audio.removeAttribute).toHaveBeenCalledExactlyOnceWith('src')
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:audio')
  const deliveries = capture.delivered.mock.calls.length
  capture.audio.dispatchEvent(new Event('loadedmetadata'))
  capture.audio.dispatchEvent(new Event('error'))
  expect(capture.delivered).toHaveBeenCalledTimes(deliveries)
}

describe('readAudioDuration', () => {
  it('should read raw duration from Blob metadata and release resources before returning', async () => {
    const result = readAudioDuration(source)
    expect(capture.createElement).toHaveBeenCalledExactlyOnceWith('audio')
    expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(source)
    expect(capture.audio.preload).toBe('metadata')
    expect(capture.audio.src).toBe('blob:audio')
    expect(capture.audio.load).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    capture.audio.dispatchEvent(new Event('loadedmetadata'))
    await expect(result).resolves.toBe(60.6)
    expect(capture.readDuration).toHaveBeenCalledOnce()
    expectReleased()
  })

  it.each([NaN, Infinity, 0, -1, 0.4])(
    'should leave acceptance of raw duration %s to the caller',
    async (duration) => {
      capture.readDuration.mockReturnValue(duration)
      const result = readAudioDuration(source)
      capture.audio.dispatchEvent(new Event('loadedmetadata'))
      await expect(result).resolves.toBe(duration)
      expectReleased()
    },
  )

  it('should return null for a media error and remove both subscriptions', async () => {
    const result = readAudioDuration(source)
    capture.audio.dispatchEvent(new Event('error'))
    await expect(result).resolves.toBeNull()
    expect(capture.readDuration).not.toHaveBeenCalled()
    expectReleased()
  })

  it.each([
    ['loadedmetadata', 'error', 60.6],
    ['error', 'loadedmetadata', null],
  ] as const)('should keep the first %s outcome when %s follows', async (first, second, value) => {
    const result = readAudioDuration(source)
    capture.audio.dispatchEvent(new Event(first))
    capture.audio.dispatchEvent(new Event(second))
    await expect(result).resolves.toBe(value)
    expectReleased()
  })

  it('should retain settled metadata when load subsequently throws', async () => {
    capture.audio.load.mockImplementation(() => {
      capture.audio.dispatchEvent(new Event('loadedmetadata'))
      throw new Error('Failure after metadata settlement')
    })
    await expect(readAudioDuration(source)).resolves.toBe(60.6)
    expectReleased()
  })

  it.each(['loadedmetadata', 'error'] as const)(
    'should preserve a cleanup rejection over the settled %s outcome',
    async (event) => {
      const error = new Error('URL cleanup failed')
      vi.mocked(URL.revokeObjectURL).mockImplementation(() => {
        throw error
      })
      const result = readAudioDuration(source)
      capture.audio.dispatchEvent(new Event(event))
      await expect(result).rejects.toBe(error)
      expectReleased()
    },
  )

  it.each(['preload', 'listener', 'source', 'load'] as const)(
    'should preserve a synchronous %s failure and release acquired resources',
    async (failure) => {
      const error = new Error('Audio setup failed')
      const fail = () => {
        throw error
      }
      switch (failure) {
        case 'preload':
          Object.defineProperty(capture.audio, 'preload', {get: () => '', set: fail})
          break
        case 'listener': {
          const subscribe = capture.subscriptions.getMockImplementation()!
          capture.subscriptions.mockImplementationOnce(subscribe).mockImplementationOnce(fail)
          break
        }
        case 'source':
          Object.defineProperty(capture.audio, 'src', {get: () => '', set: fail})
          break
        case 'load':
          capture.audio.load.mockImplementation(fail)
          break
      }
      await expect(readAudioDuration(source)).rejects.toBe(error)
      expectReleased()
    },
  )

  it('should propagate element creation failure without acquiring a URL', async () => {
    const error = new Error('Element creation failed')
    capture.createElement.mockImplementation(() => {
      throw error
    })
    await expect(readAudioDuration(source)).rejects.toBe(error)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('should propagate URL creation failure without revoking an unacquired URL', async () => {
    const error = new Error('URL creation failed')
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw error
    })
    await expect(readAudioDuration(source)).rejects.toBe(error)
    expect(capture.audio.load).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
