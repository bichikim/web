import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  createBrowserSpeechEndDetector: vi.fn(),
  decodeSpeechRecording: vi.fn(),
}))

vi.mock('../audio', async () => {
  const actual = await vi.importActual<typeof import('../audio')>('../audio')
  return {...actual, decodeSpeechRecording: dependencyMocks.decodeSpeechRecording}
})

vi.mock('../speech-end-detector', async () => {
  const actual =
    await vi.importActual<typeof import('../speech-end-detector')>('../speech-end-detector')
  return {
    ...actual,
    createBrowserSpeechEndDetector: dependencyMocks.createBrowserSpeechEndDetector,
  }
})

import {createBrowserSpeechRecorder} from '../index'

type RecorderListener = (event: BlobEvent | Event) => void

class FakeMediaRecorder {
  static autoStop = true
  static current: FakeMediaRecorder | null = null
  static data = new Blob(['audio'])
  static throwOnConstruct = false

  readonly mimeType = 'audio/webm'
  readonly #listeners = new Map<string, Array<RecorderListener>>()
  state: RecordingState = 'inactive'

  constructor() {
    if (FakeMediaRecorder.throwOnConstruct) {
      throw new Error('MediaRecorder 생성 실패')
    }

    FakeMediaRecorder.current = this
  }

  addEventListener(type: string, listener: RecorderListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'

    if (FakeMediaRecorder.autoStop) {
      this.emitStop()
    }
  }

  emitStop() {
    for (const listener of this.#listeners.get('dataavailable') ?? []) {
      listener({data: FakeMediaRecorder.data} as BlobEvent)
    }

    for (const listener of this.#listeners.get('stop') ?? []) {
      listener(new Event('stop'))
    }
  }
}

const getMediaRecorder = () => {
  const recorder = FakeMediaRecorder.current

  if (recorder === null) {
    throw new Error('MediaRecorder가 생성되지 않았습니다.')
  }

  return recorder
}

const trackStop = vi.fn()
const stream = {getTracks: () => [{stop: trackStop}]} as unknown as MediaStream
const getUserMedia = vi.fn(async () => stream)

beforeEach(() => {
  FakeMediaRecorder.autoStop = true
  FakeMediaRecorder.current = null
  FakeMediaRecorder.data = new Blob(['audio'])
  FakeMediaRecorder.throwOnConstruct = false
  dependencyMocks.createBrowserSpeechEndDetector.mockReset()
  dependencyMocks.decodeSpeechRecording.mockReset()
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia}})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createBrowserSpeechRecorder', () => {
  it('should release the microphone when recorder construction fails', async () => {
    FakeMediaRecorder.throwOnConstruct = true
    const recorder = createBrowserSpeechRecorder()

    await expect(recorder.start()).resolves.toEqual({
      error: {code: 'capture-failed', detail: 'MediaRecorder 생성 실패', retryable: true},
      ok: false,
    })
    expect(trackStop).toHaveBeenCalledTimes(1)
  })

  it('should decode one recording and release the microphone', async () => {
    const audio = Float32Array.of(0.1, 0.2)
    const decodeRecording = vi.fn(async () => audio)
    const recorder = createBrowserSpeechRecorder({decodeRecording})
    const startResult = await recorder.start()

    if (!startResult.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    const stopResult = startResult.value.stop()
    expect(getMediaRecorder().state).toBe('inactive')
    await expect(stopResult).resolves.toEqual({ok: true, value: audio})
    expect(decodeRecording).toHaveBeenCalledWith(expect.any(Blob))
    expect(trackStop).toHaveBeenCalledTimes(1)
  })

  it('should rotate speech segments without reacquiring or releasing the microphone', async () => {
    const audio = Float32Array.of(0.1, 0.2)
    const decodeRecording = vi.fn(async () => audio)
    const disposeDetector = vi.fn()
    let detectorHandler: () => void = () => undefined
    const recorder = createBrowserSpeechRecorder({
      createSpeechEndDetector: () => ({
        dispose: disposeDetector,
        subscribe: (handler) => {
          detectorHandler = handler
          return vi.fn()
        },
      }),
      decodeRecording,
    })
    const startResult = await recorder.start()

    if (!startResult.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    const onSpeechEnd = vi.fn()
    startResult.value.onSpeechEnd(onSpeechEnd)
    detectorHandler()
    expect(onSpeechEnd).toHaveBeenCalledTimes(1)

    await expect(startResult.value.takeSegment()).resolves.toEqual({ok: true, value: audio})
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(trackStop).not.toHaveBeenCalled()
    expect(getMediaRecorder().state).toBe('recording')

    await expect(startResult.value.stop()).resolves.toEqual({ok: true, value: audio})
    expect(decodeRecording).toHaveBeenCalledTimes(2)
    expect(disposeDetector).toHaveBeenCalledTimes(1)
    expect(trackStop).toHaveBeenCalledTimes(1)
  })

  it('should fail and release the microphone when the next segment cannot start', async () => {
    const recorder = createBrowserSpeechRecorder({
      createSpeechEndDetector: () => null,
      decodeRecording: vi.fn(async () => Float32Array.of(0.1)),
    })
    const startResult = await recorder.start()

    if (!startResult.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    FakeMediaRecorder.throwOnConstruct = true
    await expect(startResult.value.takeSegment()).resolves.toEqual({
      error: {code: 'capture-failed', detail: 'MediaRecorder 생성 실패', retryable: true},
      ok: false,
    })
    expect(trackStop).toHaveBeenCalledTimes(1)
  })
})

describe('browser support and capture errors', () => {
  it('should report support when all required browser APIs exist', () => {
    expect(createBrowserSpeechRecorder().isSupported()).toBe(true)
  })

  it.each([
    ['navigator is unavailable', undefined, FakeMediaRecorder],
    ['media devices are unavailable', {}, FakeMediaRecorder],
    ['getUserMedia is unavailable', {mediaDevices: {}}, FakeMediaRecorder],
    ['MediaRecorder is unavailable', {mediaDevices: {getUserMedia}}, undefined],
  ] as const)('should report unsupported when %s', (_name, navigatorValue, recorderValue) => {
    vi.stubGlobal('navigator', navigatorValue)
    vi.stubGlobal('MediaRecorder', recorderValue)
    const recorder = createBrowserSpeechRecorder()

    expect(recorder.isSupported()).toBe(false)
  })

  it('should return unsupported without requesting a microphone', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    const recorder = createBrowserSpeechRecorder()

    await expect(recorder.start()).resolves.toEqual({
      error: {code: 'unsupported', retryable: false},
      ok: false,
    })
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it.each([
    [
      'permission denial',
      new DOMException('denied', 'NotAllowedError'),
      {code: 'permission-denied', retryable: true},
    ],
    [
      'missing device',
      new DOMException('missing', 'NotFoundError'),
      {code: 'device-not-found', retryable: true},
    ],
    [
      'an Error',
      new Error('capture failed'),
      {code: 'capture-failed', detail: 'capture failed', retryable: true},
    ],
    ['a non-Error', 'capture failed', {code: 'capture-failed', detail: undefined, retryable: true}],
  ] as const)('should normalize %s from getUserMedia', async (_name, error, expected) => {
    getUserMedia.mockRejectedValueOnce(error)
    const recorder = createBrowserSpeechRecorder()

    await expect(recorder.start()).resolves.toEqual({error: expected, ok: false})
  })

  it('should reject a second start while microphone acquisition is pending', async () => {
    let resolveStream: (value: MediaStream) => void = () => undefined
    getUserMedia.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStream = resolve
      }),
    )
    const recorder = createBrowserSpeechRecorder({decodeRecording: vi.fn()})
    const firstStart = recorder.start()

    await expect(recorder.start()).resolves.toEqual({
      error: {code: 'capture-busy', retryable: true},
      ok: false,
    })
    resolveStream(stream)
    const firstResult = await firstStart
    if (firstResult.ok) {
      firstResult.value.cancel()
    }
  })
})

describe('recording segment lifecycle', () => {
  it('should cancel once and release the microphone once', async () => {
    const recorder = createBrowserSpeechRecorder({decodeRecording: vi.fn()})
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    result.value.cancel()
    result.value.cancel()

    expect(trackStop).toHaveBeenCalledTimes(1)
    await expect(result.value.stop()).resolves.toEqual({
      error: {code: 'capture-busy', retryable: true},
      ok: false,
    })
  })

  it('should ignore empty data chunks while decoding', async () => {
    FakeMediaRecorder.data = new Blob([])
    const decodeRecording = vi.fn(async (recording: Blob) => Float32Array.of(recording.size))
    const recorder = createBrowserSpeechRecorder({decodeRecording})
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    await expect(result.value.stop()).resolves.toEqual({
      ok: true,
      value: Float32Array.of(0),
    })
  })

  it.each([
    [
      'permission denial',
      new DOMException('denied', 'NotAllowedError'),
      {code: 'permission-denied', retryable: true},
    ],
    [
      'missing device',
      new DOMException('missing', 'NotFoundError'),
      {code: 'device-not-found', retryable: true},
    ],
    [
      'an Error',
      new Error('decode failed'),
      {code: 'capture-failed', detail: 'decode failed', retryable: true},
    ],
    ['a non-Error', 'decode failed', {code: 'capture-failed', detail: undefined, retryable: true}],
  ] as const)('should normalize %s from decoding', async (_name, error, expected) => {
    const recorder = createBrowserSpeechRecorder({
      decodeRecording: vi.fn().mockRejectedValue(error),
    })
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    await expect(result.value.stop()).resolves.toEqual({error: expected, ok: false})
  })

  it('should use the default audio decoder', async () => {
    const audio = Float32Array.of(0.25)
    dependencyMocks.decodeSpeechRecording.mockResolvedValue(audio)
    const recorder = createBrowserSpeechRecorder()
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    await expect(result.value.stop()).resolves.toEqual({ok: true, value: audio})
    expect(dependencyMocks.decodeSpeechRecording).toHaveBeenCalledOnce()
  })

  it('should return busy while a segment rotation is pending', async () => {
    FakeMediaRecorder.autoStop = false
    const recorder = createBrowserSpeechRecorder({
      decodeRecording: vi.fn(async () => Float32Array.of(0.1)),
    })
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }
    const firstMediaRecorder = getMediaRecorder()
    const segment = result.value.takeSegment()

    await expect(result.value.takeSegment()).resolves.toEqual({
      error: {code: 'capture-busy', retryable: true},
      ok: false,
    })
    await expect(result.value.stop()).resolves.toEqual({
      error: {code: 'capture-busy', retryable: true},
      ok: false,
    })
    firstMediaRecorder.emitStop()
    await expect(segment).resolves.toEqual({ok: true, value: Float32Array.of(0.1)})
    result.value.cancel()
  })

  it('should cancel a segment rotation and release before it completes', async () => {
    FakeMediaRecorder.autoStop = false
    const recorder = createBrowserSpeechRecorder({
      decodeRecording: vi.fn(async () => Float32Array.of(0.1)),
    })
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }
    const firstMediaRecorder = getMediaRecorder()
    const segment = result.value.takeSegment()

    result.value.cancel()
    expect(trackStop).toHaveBeenCalledTimes(1)
    firstMediaRecorder.emitStop()

    await expect(segment).resolves.toEqual({
      error: {code: 'capture-cancelled', retryable: true},
      ok: false,
    })
    expect(trackStop).toHaveBeenCalledTimes(1)
  })
})

describe('speech end detector lifecycle', () => {
  it('should initialize the default detector only once', async () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const dispose = vi.fn()
    dependencyMocks.createBrowserSpeechEndDetector.mockReturnValue({dispose, subscribe})
    const recorder = createBrowserSpeechRecorder({decodeRecording: vi.fn()})
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    expect(result.value.onSpeechEnd(vi.fn())).toBe(unsubscribe)
    expect(result.value.onSpeechEnd(vi.fn())).toBe(unsubscribe)
    expect(dependencyMocks.createBrowserSpeechEndDetector).toHaveBeenCalledOnce()
    expect(subscribe).toHaveBeenCalledTimes(2)
    result.value.cancel()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('should fall back to a no-op subscription when detector creation fails', async () => {
    const createSpeechEndDetector = vi.fn(() => {
      throw new Error('detector failed')
    })
    const recorder = createBrowserSpeechRecorder({
      createSpeechEndDetector,
      decodeRecording: vi.fn(),
    })
    const result = await recorder.start()
    if (!result.ok) {
      throw new Error('녹음을 시작하지 못했습니다.')
    }

    const unsubscribe = result.value.onSpeechEnd(vi.fn())
    unsubscribe()
    result.value.onSpeechEnd(vi.fn())

    expect(createSpeechEndDetector).toHaveBeenCalledOnce()
    result.value.cancel()
  })
})
