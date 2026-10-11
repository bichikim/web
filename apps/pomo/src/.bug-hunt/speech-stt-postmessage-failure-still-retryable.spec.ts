/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createSpeechRecognizer} from '../features/speech-to-text/client'
import type {SpeechWorkerResponse} from '../features/speech-to-text/messages'

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

  emitMessage(message: SpeechWorkerResponse) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<SpeechWorkerResponse>)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current
  if (worker === null) {
    throw new Error('Worker not created')
  }
  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should allow preparation again after a recoverable postMessage failure without terminating the Worker', async () => {
  const recognizer = createSpeechRecognizer({
    modelId: 'whisper-tiny',
    onBackendChange: vi.fn(),
    onProgress: vi.fn(),
    preferredBackend: 'wasm',
  })
  const worker = getWorker()
  worker.postMessage.mockImplementationOnce(() => {
    throw new DOMException('복제 실패', 'DataCloneError')
  })

  const firstPreparation = await recognizer.prepare()
  expect(firstPreparation).toMatchObject({
    error: {code: 'worker-failed', phase: 'prepare', retryable: true},
    ok: false,
  })
  expect(worker.terminate).not.toHaveBeenCalled()

  const secondPreparation = recognizer.prepare()
  worker.emitMessage({backend: 'wasm', requestId: 2, type: 'ready'})

  await expect(secondPreparation).resolves.toEqual({ok: true, value: {backend: 'wasm'}})
})
