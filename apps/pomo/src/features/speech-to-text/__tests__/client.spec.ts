import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createSpeechRecognizer} from '../index'
import type {SpeechWorkerResponse} from '../messages'

type WorkerListener = (event: ErrorEvent | MessageEvent<SpeechWorkerResponse>) => void

class FakeWorker {
  static current: FakeWorker | null = null

  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<string, Array<WorkerListener>>()

  constructor() {
    FakeWorker.current = this
  }

  addEventListener(type: string, listener: WorkerListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitError(message: string) {
    for (const listener of this.#listeners.get('error') ?? []) {
      listener({message} as ErrorEvent)
    }
  }

  emitMessage(message: SpeechWorkerResponse) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<SpeechWorkerResponse>)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current

  if (worker === null) {
    throw new Error('음성 인식 Worker가 생성되지 않았습니다.')
  }

  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createSpeechRecognizer', () => {
  it('should deduplicate preparation and expose progress and backend changes', async () => {
    const onBackendChange = vi.fn()
    const onProgress = vi.fn()
    const recognizer = createSpeechRecognizer({
      modelId: 'whisper-base',
      onBackendChange,
      onProgress,
      preferredBackend: 'webgpu',
    })
    const worker = getWorker()
    const firstPreparation = recognizer.prepare()
    const secondPreparation = recognizer.prepare()

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith(
      {modelId: 'whisper-base', preferredBackend: 'webgpu', requestId: 1, type: 'prepare'},
      [],
    )
    worker.emitMessage({progress: 45, type: 'loading'})
    worker.emitMessage({backend: 'wasm', type: 'backend-changed'})
    worker.emitMessage({backend: 'wasm', requestId: 1, type: 'ready'})

    await expect(firstPreparation).resolves.toEqual({ok: true, value: {backend: 'wasm'}})
    await expect(secondPreparation).resolves.toEqual({ok: true, value: {backend: 'wasm'}})
    expect(onProgress).toHaveBeenCalledWith(45)
    expect(onBackendChange).toHaveBeenCalledWith('wasm')
  })

  it('should match transcription responses by request id and reject concurrent work', async () => {
    const recognizer = createSpeechRecognizer({
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onProgress: vi.fn(),
      preferredBackend: 'wasm',
    })
    const worker = getWorker()
    const audio = Float32Array.of(0.1, 0.2)
    const transcription = recognizer.transcribe({audio, language: 'korean'})

    await expect(
      recognizer.transcribe({audio: Float32Array.of(0.3), language: 'korean'}),
    ).resolves.toEqual({
      error: {code: 'busy', phase: 'transcribe', retryable: true},
      ok: false,
    })
    worker.emitMessage({backend: 'wasm', requestId: 99, text: '잘못된 응답', type: 'complete'})
    worker.emitMessage({backend: 'wasm', requestId: 1, text: '안녕하세요', type: 'complete'})

    await expect(transcription).resolves.toEqual({
      ok: true,
      value: {backend: 'wasm', text: '안녕하세요'},
    })
    const sentAudio = worker.postMessage.mock.calls[0]?.[0].audio as Float32Array
    expect(worker.postMessage).toHaveBeenCalledWith(
      {
        audio: expect.any(Float32Array),
        language: 'korean',
        modelId: 'whisper-tiny',
        preferredBackend: 'wasm',
        requestId: 1,
        type: 'transcribe',
      },
      [sentAudio.buffer],
    )
    expect(sentAudio).not.toBe(audio)
    expect(sentAudio).toEqual(audio)
    expect(audio.byteLength).toBeGreaterThan(0)
  })

  it('should resolve pending work on worker failure and cancellation', async () => {
    const recognizer = createSpeechRecognizer({
      modelId: 'moonshine-tiny-ko',
      onBackendChange: vi.fn(),
      onProgress: vi.fn(),
      preferredBackend: 'webgpu',
    })
    const worker = getWorker()
    const preparation = recognizer.prepare()
    const transcription = recognizer.transcribe({
      audio: Float32Array.of(0.1),
      language: 'korean',
    })

    worker.emitError('Worker 연결 끊김')
    await expect(preparation).resolves.toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 연결 끊김',
        phase: 'prepare',
        retryable: true,
      },
      ok: false,
    })
    await expect(transcription).resolves.toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 연결 끊김',
        phase: 'transcribe',
        retryable: true,
      },
      ok: false,
    })

    const brokenRetry = recognizer.prepare()
    recognizer.dispose()
    await expect(brokenRetry).resolves.toMatchObject({
      error: {code: 'worker-failed'},
      ok: false,
    })
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})
