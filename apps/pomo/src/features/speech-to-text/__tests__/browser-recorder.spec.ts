import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createBrowserSpeechRecorder} from '../index'

type RecorderListener = (event: BlobEvent | Event) => void

class FakeMediaRecorder {
  static current: FakeMediaRecorder | null = null
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

    for (const listener of this.#listeners.get('dataavailable') ?? []) {
      listener({data: new Blob(['audio'])} as BlobEvent)
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
  FakeMediaRecorder.current = null
  FakeMediaRecorder.throwOnConstruct = false
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
