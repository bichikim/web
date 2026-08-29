import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createSupertonicClient} from '../client'
import type {SupertonicWorkerOutput} from '../messages'

const SAMPLE_RATE = 24_000
const GENERATION_TIME = 850

class FakeWorker {
  static current: FakeWorker | null = null

  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<
    string,
    Array<(event: MessageEvent<SupertonicWorkerOutput>) => void>
  >()

  constructor() {
    FakeWorker.current = this
  }

  addEventListener(type: string, listener: (event: MessageEvent<SupertonicWorkerOutput>) => void) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitMessage(message: SupertonicWorkerOutput) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<SupertonicWorkerOutput>)
    }
  }

  emitError(event: Partial<ErrorEvent> = {}) {
    for (const listener of this.#listeners.get('error') ?? []) {
      listener(event as MessageEvent<SupertonicWorkerOutput>)
    }
  }

  emitMessageError() {
    for (const listener of this.#listeners.get('messageerror') ?? []) {
      listener({} as MessageEvent<SupertonicWorkerOutput>)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current

  if (worker === null) {
    throw new Error('Worker가 생성되지 않았습니다.')
  }

  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  document.documentElement.lang = 'ko-KR'
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createSupertonicClient', () => {
  it('should initialize the selected model and forward progress and status events', async () => {
    const onProgress = vi.fn()
    const onStatus = vi.fn()
    const client = createSupertonicClient()
    const worker = getWorker()
    const initialization = client.initialize({modelId: 'int8', onProgress, onStatus})

    expect(worker.postMessage).toHaveBeenCalledWith({modelId: 'int8', type: 'initialize'})
    worker.emitMessage({
      progress: {fileName: '모델', loadedBytes: 1, totalBytes: 2},
      type: 'progress',
    })
    worker.emitMessage({message: '확인 중', type: 'status'})
    worker.emitMessage({backend: 'wasm', type: 'ready'})
    expect(await initialization).toEqual({ok: true, value: undefined})

    expect(onProgress).toHaveBeenCalledWith({fileName: '모델', loadedBytes: 1, totalBytes: 2})
    expect(onStatus).toHaveBeenCalledWith('확인 중')
  })

  it('should resolve generated audio and return a failure for concurrent requests', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const text = '**네, 좋아요.**'
    const generation = client.generate({text, voice: {id: 'F1', kind: 'preset'}})

    expect(await client.generate({text: '다시', voice: {id: 'F2', kind: 'preset'}})).toEqual({
      error: {code: 'generation-busy', phase: 'generate', retryable: true},
      ok: false,
    })
    const samples = Float32Array.of(0.1)
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples,
      type: 'result',
    })

    expect(await generation).toEqual({
      ok: true,
      value: {
        generationTime: GENERATION_TIME,
        sampleRate: SAMPLE_RATE,
        samples,
      },
    })
    expect(worker.postMessage).toHaveBeenCalledWith({
      language: 'ko',
      requestId: 1,
      speed: 0.8,
      text,
      type: 'generate',
      voice: {id: 'F1', kind: 'preset'},
    })
  })

  it('should keep normal speed for longer speech and preserve an explicit speed', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const voice = {id: 'F1' as const, kind: 'preset' as const}
    const longText = '일이삼사오육칠팔구십일'
    const longGeneration = client.generate({text: longText, voice})

    expect(worker.postMessage).toHaveBeenLastCalledWith({
      language: 'ko',
      requestId: 1,
      speed: 1.05,
      text: longText,
      type: 'generate',
      voice,
    })
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: Float32Array.of(0.1),
      type: 'result',
    })
    await longGeneration

    const explicitGeneration = client.generate({speed: 1.2, text: '짧은 말', voice})
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      language: 'ko',
      requestId: 2,
      speed: 1.2,
      text: '짧은 말',
      type: 'generate',
      voice,
    })
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 2,
      sampleRate: SAMPLE_RATE,
      samples: Float32Array.of(0.1),
      type: 'result',
    })
    await explicitGeneration
  })

  it('should use the short speed for text without spoken characters and ignore non-stream chunks', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const generation = client.generate({text: '** **', voice: {id: 'F1', kind: 'preset'}})

    worker.emitMessage({
      generationTime: 100,
      index: 0,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: Float32Array.of(0.1),
      total: 1,
      type: 'chunk',
    })
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({speed: 0.8, type: 'generate'}),
    )
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: Float32Array.of(0.1),
      type: 'result',
    })
    await generation
  })

  it('should prefer an explicitly selected language over the document language', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const generation = client.generate({
      language: 'na',
      text: '언어 중립 대사',
      voice: {id: 'F1', kind: 'preset'},
    })

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({language: 'na', type: 'generate'}),
    )
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: Float32Array.of(0.1),
      type: 'result',
    })
    await generation
  })

  it('should yield each completed chunk before the final combined audio', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const stream = client.generateStream({
      text: '긴 대사',
      voice: {
        kind: 'custom',
        value: {
          duration: {data: [0.1], dimensions: [1]},
          speech: {data: [0.2], dimensions: [1]},
        },
      },
    })
    const firstEvent = stream.next()
    const chunkSamples = Float32Array.of(0.1, 0.2)
    worker.emitMessage({
      generationTime: 300,
      index: 0,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: chunkSamples,
      total: 2,
      type: 'chunk',
    })

    expect(await firstEvent).toEqual({
      done: false,
      value: {
        ok: true,
        value: {
          audio: {
            generationTime: 300,
            index: 0,
            sampleRate: SAMPLE_RATE,
            samples: chunkSamples,
            total: 2,
          },
          type: 'chunk',
        },
      },
    })

    const finalEvent = stream.next()
    const combinedSamples = Float32Array.of(0.1, 0.2, 0, 0.3)
    worker.emitMessage({
      generationTime: GENERATION_TIME,
      requestId: 1,
      sampleRate: SAMPLE_RATE,
      samples: combinedSamples,
      type: 'result',
    })

    expect(await finalEvent).toEqual({
      done: false,
      value: {
        ok: true,
        value: {
          audio: {
            generationTime: GENERATION_TIME,
            sampleRate: SAMPLE_RATE,
            samples: combinedSamples,
          },
          type: 'complete',
        },
      },
    })
    expect(await stream.next()).toEqual({done: true, value: undefined})
  })

  it('should yield a generation failure as the final stream event', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const stream = client.generateStream({text: '실패', voice: {id: 'F1', kind: 'preset'}})
    const event = stream.next()
    const error = {
      code: 'cancelled' as const,
      phase: 'generate' as const,
      retryable: false as const,
    }

    worker.emitMessage({error, requestId: 1, type: 'error'})

    await expect(event).resolves.toEqual({done: false, value: {error, ok: false}})
    await expect(stream.next()).resolves.toEqual({done: true, value: undefined})
  })

  it('should route structured initialization and generation failures to pending operations', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const initialization = client.initialize({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
    })
    const initializationError = {
      backend: 'wasm' as const,
      code: 'backend-failed' as const,
      detail: '초기화 실패',
      phase: 'initialize' as const,
      retryable: false,
    }
    worker.emitMessage({error: initializationError, requestId: null, type: 'error'})
    expect(await initialization).toEqual({error: initializationError, ok: false})

    const generation = client.generate({text: '안녕', voice: {id: 'M1', kind: 'preset'}})
    const generationError = {
      code: 'worker-failed' as const,
      detail: '생성 실패',
      phase: 'generate' as const,
      retryable: true as const,
    }
    worker.emitMessage({error: generationError, requestId: 1, type: 'error'})
    expect(await generation).toEqual({error: generationError, ok: false})
  })

  it('should reject pending and later work after a Worker failure', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const initialization = client.initialize({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
    })
    worker.emitError()
    expect(await initialization).toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 실행 오류',
        phase: 'initialize',
        retryable: true,
      },
      ok: false,
    })

    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(await client.generate({text: '다시', voice: {id: 'F1', kind: 'preset'}})).toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 실행 오류',
        phase: 'generate',
        retryable: true,
      },
      ok: false,
    })
    expect(
      await client.initialize({modelId: 'int8', onProgress: vi.fn(), onStatus: vi.fn()}),
    ).toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 실행 오류',
        phase: 'initialize',
        retryable: true,
      },
      ok: false,
    })
    worker.emitError()
    expect(worker.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({type: 'generate'}))

    client.dispose()
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'dispose'})
  })

  it('should resolve pending generation as cancelled on disposal', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const generation = client.generate({text: '안녕', voice: {id: 'F1', kind: 'preset'}})

    client.dispose()
    client.dispose()

    expect(await generation).toEqual({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      ok: false,
    })
    expect(
      await client.initialize({modelId: 'int8', onProgress: vi.fn(), onStatus: vi.fn()}),
    ).toEqual({
      error: {code: 'cancelled', phase: 'initialize', retryable: false},
      ok: false,
    })
    expect(await client.generate({text: '다시', voice: {id: 'F1', kind: 'preset'}})).toEqual({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      ok: false,
    })
    expect(worker.postMessage).toHaveBeenCalledTimes(2)
  })

  it('should request generation cancellation without disposing the model', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const generation = client.generate({text: '안녕', voice: {id: 'F1', kind: 'preset'}})

    client.cancelGeneration()

    expect(worker.postMessage).toHaveBeenCalledWith({type: 'cancel-generation'})
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'dispose'})
    worker.emitMessage({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      requestId: 1,
      type: 'error',
    })
    expect(await generation).toEqual({
      error: {code: 'cancelled', phase: 'generate', retryable: false},
      ok: false,
    })
  })

  it('should resolve pending generation as a Worker failure when the Worker crashes', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const generation = client.generate({text: '안녕', voice: {id: 'F1', kind: 'preset'}})

    worker.emitError()

    expect(await generation).toEqual({
      error: {
        code: 'worker-failed',
        detail: 'Worker 실행 오류',
        phase: 'generate',
        retryable: true,
      },
      ok: false,
    })
  })

  it('should report detailed Worker and message deserialization failures once', async () => {
    const first = createSupertonicClient()
    const firstWorker = getWorker()
    const initialization = first.initialize({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
    })
    const cause = new Error('worker crashed')
    firstWorker.emitError({error: cause, message: '구체적인 Worker 오류'})
    await expect(initialization).resolves.toMatchObject({
      error: {detail: '구체적인 Worker 오류'},
      ok: false,
    })

    const second = createSupertonicClient()
    const secondWorker = getWorker()
    const secondInitialization = second.initialize({
      modelId: 'full',
      onProgress: vi.fn(),
      onStatus: vi.fn(),
    })
    secondWorker.emitMessageError()
    await expect(secondInitialization).resolves.toMatchObject({
      error: {detail: 'Worker 응답을 읽지 못했습니다.'},
      ok: false,
    })
  })

  it('should make disposal acknowledgement and cancellation idempotent', () => {
    const client = createSupertonicClient()
    const worker = getWorker()

    client.cancelGeneration()
    worker.emitMessage({type: 'disposed'})
    worker.emitMessage({type: 'disposed'})
    worker.emitError()
    client.cancelGeneration()
    client.dispose()
    client.cancelGeneration()

    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'cancel-generation'})
  })
})
