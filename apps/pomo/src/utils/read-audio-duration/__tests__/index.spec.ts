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
  const listeners = new Map<EventListenerOrEventListenerObject, EventListener>()
  const removeListener = audio.removeEventListener.bind(audio)
  vi.spyOn(audio, 'removeEventListener').mockImplementation((event, listener, options) => {
    if (listener !== null) {
      removeListener(event, listeners.get(listener) ?? listener, options)
    }
  })
  const addListener = audio.addEventListener.bind(audio)
  const subscriptions = vi
    .spyOn(audio, 'addEventListener')
    .mockImplementation((event, listener, options) => {
      if (listener !== null) {
        const wrapped: EventListener = (notification) => {
          delivered(notification.type)
          if (typeof listener === 'function') {
            listener.call(audio, notification)
          } else {
            listener.handleEvent(notification)
          }
        }
        listeners.set(listener, wrapped)
        addListener(event, wrapped, options)
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

it('should reject at the caller deadline when no media event arrives', async () => {
  vi.useFakeTimers()
  try {
    const observed = vi.fn()
    const result = readAudioDuration(source, {timeoutMs: 25})
    const outcome = result.then(observed, observed)
    await vi.advanceTimersByTimeAsync(25)
    expect(observed).toHaveBeenCalledOnce()
    expect(observed).toHaveBeenCalledWith(expect.objectContaining({name: 'TimeoutError'}))
    await outcome
    expectReleased()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})

it('should still revoke the URL when removing the source throws', async () => {
  const error = new Error('Source cleanup failed')
  capture.audio.removeAttribute.mockImplementation(() => {
    throw error
  })
  const result = readAudioDuration(source)
  capture.audio.dispatchEvent(new Event('loadedmetadata'))
  await expect(result).rejects.toBe(error)
  expectReleased()
})

it('should not acquire resources for an already aborted signal', async () => {
  const controller = new AbortController()
  const reason = new Error('Cancelled')
  controller.abort(reason)
  await expect(readAudioDuration(source, {signal: controller.signal, timeoutMs: 25})).rejects.toBe(
    reason,
  )
  expect(capture.createElement).not.toHaveBeenCalled()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})

it.each([
  'element',
  'url',
  'preload',
  'metadata-listener',
  'error-listener',
  'source',
  'load',
] as const)('should stop setup and release acquisitions when aborted during %s', async (stage) => {
  const controller = new AbortController()
  const reason = new Error('Cancelled during setup')
  const abort = () => controller.abort(reason)
  if (stage === 'element') {
    capture.createElement.mockImplementation(() => {
      abort()
      return capture.audio
    })
  }
  if (stage === 'url') {
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      abort()
      return 'blob:audio'
    })
  }
  if (stage === 'preload') {
    Object.defineProperty(capture.audio, 'preload', {get: () => '', set: abort})
  }
  if (stage === 'source') {
    Object.defineProperty(capture.audio, 'src', {get: () => '', set: abort})
  }
  if (stage === 'load') {
    capture.audio.load.mockImplementation(() => {
      abort()
      throw new Error('Too late')
    })
  }
  if (stage === 'metadata-listener' || stage === 'error-listener') {
    const subscribe = capture.subscriptions.getMockImplementation()!
    capture.subscriptions.mockImplementation((event, listener, settings) => {
      subscribe(event, listener, settings)
      if (event === (stage === 'metadata-listener' ? 'loadedmetadata' : 'error')) {
        abort()
      }
    })
  }
  const removeAbort = vi.spyOn(controller.signal, 'removeEventListener')
  await expect(readAudioDuration(source, {signal: controller.signal, timeoutMs: 25})).rejects.toBe(
    reason,
  )
  expect(removeAbort).toHaveBeenCalledWith('abort', expect.any(Function))
  if (stage === 'element') {
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(capture.audio.removeAttribute).toHaveBeenCalledOnce()
  } else {
    expectReleased()
  }
  if (stage !== 'load') {
    expect(capture.audio.load).not.toHaveBeenCalled()
  }
})

it.each(['metadata', 'error', 'abort', 'timeout'] as const)(
  'should keep the first %s settlement, clear timers and ignore later notifications',
  async (first) => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const reason = new Error('Cancelled')
      const removeAbort = vi.spyOn(controller.signal, 'removeEventListener')
      const result = readAudioDuration(source, {signal: controller.signal, timeoutMs: 25})
      const observed = result.then(
        (value) => ({value}),
        (error) => ({error}),
      )
      if (first === 'metadata') {
        capture.audio.dispatchEvent(new Event('loadedmetadata'))
      }
      if (first === 'error') {
        capture.audio.dispatchEvent(new Event('error'))
      }
      if (first === 'abort') {
        controller.abort(reason)
      }
      if (first === 'timeout') {
        await vi.advanceTimersByTimeAsync(25)
      }
      controller.abort(reason)
      capture.audio.dispatchEvent(new Event('loadedmetadata'))
      capture.audio.dispatchEvent(new Event('error'))
      await vi.advanceTimersByTimeAsync(25)
      const outcome = await observed
      if (first === 'metadata') {
        expect(outcome).toEqual({value: 60.6})
      }
      if (first === 'error') {
        expect(outcome).toEqual({value: null})
      }
      if (first === 'abort') {
        expect(outcome).toEqual({error: reason})
      }
      if (first === 'timeout') {
        expect(outcome).toMatchObject({error: {name: 'TimeoutError'}})
      }
      expect(capture.readDuration).toHaveBeenCalledTimes(first === 'metadata' ? 1 : 0)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
      expectReleased()
    } finally {
      vi.useRealTimers()
    }
  },
)

it('should capture seconds at the event rather than at the continuation', async () => {
  const result = readAudioDuration(source)
  capture.audio.dispatchEvent(new Event('loadedmetadata'))
  capture.readDuration.mockReturnValue(99)
  await expect(result).resolves.toBe(60.6)
})

it('should reject a duration getter failure and release resources', async () => {
  const error = new Error('Duration getter failed')
  capture.readDuration.mockImplementation(() => {
    throw error
  })
  const result = readAudioDuration(source)
  capture.audio.dispatchEvent(new Event('loadedmetadata'))
  await expect(result).rejects.toBe(error)
  expectReleased()
})

it.each([NaN, Infinity, -1, 2_147_483_648])(
  'should reject invalid deadline %s before setup',
  async (timeoutMs) => {
    await expect(readAudioDuration(source, {timeoutMs})).rejects.toBeInstanceOf(RangeError)
    expect(capture.createElement).not.toHaveBeenCalled()
  },
)

it.each(['metadata', 'media-error', 'setup-error', 'abort', 'timeout'] as const)(
  'should report every cleanup failure after %s without skipping later releases',
  async (first) => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const primary = new Error('Primary failure')
      const abortCleanup = new Error('Abort listener cleanup failed')
      const metadataCleanup = new Error('Metadata listener cleanup failed')
      const mediaErrorCleanup = new Error('Error listener cleanup failed')
      const sourceCleanup = new Error('Source cleanup failed')
      const urlCleanup = new Error('URL cleanup failed')
      vi.spyOn(controller.signal, 'removeEventListener').mockImplementation(() => {
        throw abortCleanup
      })
      const remove = vi.spyOn(capture.audio, 'removeEventListener')
      const actualRemove = remove.getMockImplementation()!
      remove.mockImplementation((event, listener, settings) => {
        actualRemove(event, listener, settings)
        throw event === 'loadedmetadata' ? metadataCleanup : mediaErrorCleanup
      })
      capture.audio.removeAttribute.mockImplementation(() => {
        throw sourceCleanup
      })
      vi.mocked(URL.revokeObjectURL).mockImplementation(() => {
        throw urlCleanup
      })
      if (first === 'setup-error') {
        capture.audio.load.mockImplementation(() => {
          throw primary
        })
      }
      const result = readAudioDuration(source, {signal: controller.signal, timeoutMs: 25})
      const observed = result.catch((error) => error)
      if (first === 'metadata') {
        capture.audio.dispatchEvent(new Event('loadedmetadata'))
      }
      if (first === 'media-error') {
        capture.audio.dispatchEvent(new Event('error'))
      }
      if (first === 'abort') {
        controller.abort(primary)
      }
      if (first === 'timeout') {
        await vi.advanceTimersByTimeAsync(25)
      }
      const failure = await observed
      expect(failure).toBeInstanceOf(AggregateError)
      const cleanup = [abortCleanup, metadataCleanup, mediaErrorCleanup, sourceCleanup, urlCleanup]
      if (first === 'metadata' || first === 'media-error') {
        expect(failure.errors).toEqual(cleanup)
      } else {
        if (first === 'timeout') {
          expect(failure.cause).toMatchObject({name: 'TimeoutError'})
        } else {
          expect(failure.cause).toBe(primary)
        }
        expect(failure.errors).toEqual([failure.cause, ...cleanup])
      }
      expect(remove).toHaveBeenCalledTimes(2)
      expectReleased()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  },
)

it('should attempt all releases when timer clearing throws', async () => {
  vi.useFakeTimers()
  try {
    const error = new Error('Timer cleanup failed')
    const clear = globalThis.clearTimeout
    vi.spyOn(globalThis, 'clearTimeout').mockImplementation((timer) => {
      clear(timer)
      throw error
    })
    const result = readAudioDuration(source, {timeoutMs: 0})
    capture.audio.dispatchEvent(new Event('loadedmetadata'))
    await expect(result).rejects.toBe(error)
    expectReleased()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})

it.each(['element', 'url', 'preload', 'listener', 'source', 'load'] as const)(
  'should clear deadline and abort subscription after synchronous %s failure',
  async (stage) => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const removeAbort = vi.spyOn(controller.signal, 'removeEventListener')
      const error = new Error('Setup failed')
      const fail = () => {
        throw error
      }
      if (stage === 'element') {
        capture.createElement.mockImplementation(fail)
      }
      if (stage === 'url') {
        vi.mocked(URL.createObjectURL).mockImplementation(fail)
      }
      if (stage === 'preload') {
        Object.defineProperty(capture.audio, 'preload', {get: () => '', set: fail})
      }
      if (stage === 'listener') {
        capture.subscriptions.mockImplementation(fail)
      }
      if (stage === 'source') {
        Object.defineProperty(capture.audio, 'src', {get: () => '', set: fail})
      }
      if (stage === 'load') {
        capture.audio.load.mockImplementation(fail)
      }
      await expect(
        readAudioDuration(source, {signal: controller.signal, timeoutMs: 25}),
      ).rejects.toBe(error)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
      if (stage !== 'element' && stage !== 'url') {
        expectReleased()
      } else {
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      }
    } finally {
      vi.useRealTimers()
    }
  },
)
