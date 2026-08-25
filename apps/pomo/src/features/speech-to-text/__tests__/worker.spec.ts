import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {SpeechWorkerRequest, SpeechWorkerResponse} from '../messages'

interface MockPipelineOptions {
  readonly device: 'wasm' | 'webgpu'
  readonly progress_callback: (progress: {
    readonly files: Readonly<Record<string, {readonly loaded: number; readonly total: number}>>
    readonly loaded: number
    readonly name: string
    readonly progress: number
    readonly status: 'progress_total'
    readonly total: number
  }) => void
}

type WorkerMessageListener = (event: MessageEvent<SpeechWorkerRequest>) => void

const transformers = vi.hoisted(() => ({pipeline: vi.fn(), transcribe: vi.fn()}))

vi.mock('@huggingface/transformers', () => ({pipeline: transformers.pipeline}))

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: SpeechWorkerResponse) => void>()

  vi.stubGlobal('self', {
    addEventListener: (type: string, listener: WorkerMessageListener) => {
      if (type === 'message') {
        messageListener = listener
      }
    },
    postMessage,
  })
  await import('../worker')

  return {
    dispatch: (request: SpeechWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('음성 인식 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<SpeechWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  transformers.transcribe.mockResolvedValue({text: ' 안녕하세요 '})
  transformers.pipeline.mockResolvedValue(transformers.transcribe)
})

describe('speech recognition worker', () => {
  it('should fall back to WASM and preserve the preparation request id', async () => {
    transformers.pipeline.mockImplementation(
      async (_task: string, _model: string, options: MockPipelineOptions) => {
        if (options.device === 'webgpu') {
          throw new Error('WebGPU 초기화 실패')
        }

        options.progress_callback({
          files: {'model.onnx': {loaded: 55, total: 100}},
          loaded: 55,
          name: 'whisper',
          progress: 55,
          status: 'progress_total',
          total: 100,
        })
        return transformers.transcribe
      },
    )
    const worker = await loadWorker()
    worker.dispatch({
      modelId: 'whisper-base',
      preferredBackend: 'webgpu',
      requestId: 7,
      type: 'prepare',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 7,
        type: 'ready',
      })
    })
    expect(worker.postMessage).toHaveBeenCalledWith({backend: 'wasm', type: 'backend-changed'})
    expect(worker.postMessage).toHaveBeenCalledWith({progress: 55, type: 'loading'})
    expect(transformers.pipeline).toHaveBeenLastCalledWith(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      expect.objectContaining({device: 'wasm'}),
    )
  })

  it('should transcribe the requested language and return the matching request id', async () => {
    const worker = await loadWorker()
    const audio = Float32Array.of(0.1, 0.2)
    worker.dispatch({
      audio,
      language: 'korean',
      modelId: 'whisper-tiny',
      preferredBackend: 'wasm',
      requestId: 12,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 12,
        text: '안녕하세요',
        type: 'complete',
      })
    })
    expect(transformers.transcribe).toHaveBeenCalledWith(audio, {
      language: 'korean',
      task: 'transcribe',
    })
  })

  it('should return a structured model failure for the originating request', async () => {
    transformers.pipeline.mockRejectedValue(new Error('모델 다운로드 실패'))
    const worker = await loadWorker()
    worker.dispatch({
      modelId: 'whisper-tiny',
      preferredBackend: 'wasm',
      requestId: 21,
      type: 'prepare',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        error: {
          code: 'model-failed',
          detail: '모델 다운로드 실패',
          phase: 'prepare',
          retryable: true,
        },
        requestId: 21,
        type: 'error',
      })
    })
  })

  it('should run a Korean Moonshine model without Whisper generation options', async () => {
    const worker = await loadWorker()
    const audio = Float32Array.of(0.1, 0.2)
    worker.dispatch({
      audio,
      language: 'korean',
      modelId: 'moonshine-tiny-ko',
      preferredBackend: 'wasm',
      requestId: 31,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        backend: 'wasm',
        requestId: 31,
        text: '안녕하세요',
        type: 'complete',
      })
    })
    expect(transformers.pipeline).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      'onnx-community/moonshine-tiny-ko-ONNX',
      expect.objectContaining({device: 'wasm'}),
    )
    expect(transformers.transcribe).toHaveBeenCalledWith(audio)
  })

  it('should clamp reported progress and reuse an already prepared model', async () => {
    transformers.pipeline.mockImplementation(
      async (_task: string, _model: string, options: MockPipelineOptions) => {
        options.progress_callback({status: 'download'} as never)
        options.progress_callback({
          files: {},
          loaded: 0,
          name: 'whisper',
          progress: -10,
          status: 'progress_total',
          total: 100,
        })
        options.progress_callback({
          files: {},
          loaded: 100,
          name: 'whisper',
          progress: 110,
          status: 'progress_total',
          total: 100,
        })
        return transformers.transcribe
      },
    )
    const worker = await loadWorker()
    const request = {
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 40,
      type: 'prepare',
    } as const

    worker.dispatch(request)
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 40, type: 'ready'}),
      ),
    )
    worker.dispatch({...request, requestId: 41})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 41, type: 'ready'}),
      ),
    )

    expect(worker.postMessage).toHaveBeenCalledWith({progress: 0, type: 'loading'})
    expect(worker.postMessage).toHaveBeenCalledWith({progress: 100, type: 'loading'})
    expect(transformers.pipeline).toHaveBeenCalledOnce()
  })

  it('should reset a failed preparation so it can be retried', async () => {
    transformers.pipeline.mockRejectedValueOnce(new Error('temporary failure'))
    const worker = await loadWorker()
    const request = {
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 50,
      type: 'prepare',
    } as const

    worker.dispatch(request)
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 50, type: 'error'}),
      ),
    )
    worker.dispatch({...request, requestId: 51})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 51, type: 'ready'}),
      ),
    )

    expect(transformers.pipeline).toHaveBeenCalledTimes(2)
  })

  it('should share an in-flight model preparation between requests', async () => {
    let resolvePipeline: ((transcriber: typeof transformers.transcribe) => void) | undefined
    transformers.pipeline.mockReturnValue(
      new Promise((resolve) => {
        resolvePipeline = resolve
      }),
    )
    const worker = await loadWorker()
    const request = {
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 55,
      type: 'prepare',
    } as const

    worker.dispatch(request)
    worker.dispatch({...request, requestId: 56})
    await vi.waitFor(() => expect(transformers.pipeline).toHaveBeenCalledOnce())
    resolvePipeline?.(transformers.transcribe)

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 55, type: 'ready'}),
      )
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 56, type: 'ready'}),
      )
    })
  })

  it('should report a preparation failure from a transcription request', async () => {
    transformers.pipeline.mockRejectedValue('unknown failure')
    const worker = await loadWorker()

    worker.dispatch({
      audio: Float32Array.of(0.1),
      language: 'korean',
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 60,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'model-failed',
          detail: '알 수 없는 오류',
          phase: 'transcribe',
          retryable: true,
        },
        requestId: 60,
        type: 'error',
      })
    })
  })

  it('should report when a pipeline resolves without a transcriber', async () => {
    transformers.pipeline.mockResolvedValue(null)
    const worker = await loadWorker()

    worker.dispatch({
      audio: Float32Array.of(0.1),
      language: 'korean',
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 61,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'model-failed',
          detail: '음성 인식 모델이 준비되지 않았습니다.',
          phase: 'transcribe',
          retryable: true,
        },
        requestId: 61,
        type: 'error',
      })
    })
  })

  it.each([
    [new Error('transcription failed'), 'transcription failed'],
    [new Error(''), '알 수 없는 오류'],
    ['unknown failure', '알 수 없는 오류'],
  ])('should report transcription pipeline failures', async (error, detail) => {
    transformers.transcribe.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({
      audio: Float32Array.of(0.1),
      language: 'korean',
      modelId: 'whisper-base',
      preferredBackend: 'wasm',
      requestId: 62,
      type: 'transcribe',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'transcription-failed',
          detail,
          phase: 'transcribe',
          retryable: true,
        },
        requestId: 62,
        type: 'error',
      })
    })
  })

  it.each(['prepare', 'transcribe'] as const)(
    'should report uncaught %s worker failures',
    async (type) => {
      const worker = await loadWorker()
      let postCount = 0
      worker.postMessage.mockImplementation(() => {
        postCount += 1
        if (postCount <= 2) {
          throw new Error('post failed')
        }
      })
      const request =
        type === 'prepare'
          ? ({
              modelId: 'whisper-base',
              preferredBackend: 'wasm',
              requestId: 70,
              type,
            } as const)
          : ({
              audio: Float32Array.of(0.1),
              language: 'korean',
              modelId: 'whisper-base',
              preferredBackend: 'wasm',
              requestId: 70,
              type,
            } as const)

      worker.dispatch(request)

      await vi.waitFor(() => {
        expect(worker.postMessage).toHaveBeenLastCalledWith({
          error: {
            code: 'worker-failed',
            detail: 'post failed',
            phase: type,
            retryable: true,
          },
          requestId: 70,
          type: 'error',
        })
      })
    },
  )

  it('should reject an unsupported worker request', async () => {
    const worker = await loadWorker()

    expect(() => {
      worker.dispatch({requestId: 80, type: 'unsupported'} as unknown as SpeechWorkerRequest)
    }).toThrow("Cannot read properties of undefined (reading 'catch')")
  })
})
