import {beforeEach, describe, expect, it, vi} from 'vitest'

import classifierArtifact from '../classifier-artifact.json'
import type {TextMoodWorkerRequest, TextMoodWorkerResponse} from '../messages'
import {TEXT_MOOD_MODEL} from '../model'

interface MockPipelineOptions {
  readonly device: 'wasm'
  readonly dtype: 'q8'
  readonly progress_callback: (progress: {
    readonly files: Readonly<Record<string, {readonly loaded: number; readonly total: number}>>
    readonly loaded: number
    readonly name: string
    readonly progress: number
    readonly status: 'progress_total'
    readonly total: number
  }) => void
}

type WorkerMessageListener = (event: MessageEvent<TextMoodWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  env: {
    allowLocalModels: true,
    allowRemoteModels: false,
    remoteHost: '',
    remotePathTemplate: '',
  },
  extract: vi.fn(),
  pipeline: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  env: transformers.env,
  pipeline: transformers.pipeline,
}))

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: TextMoodWorkerResponse) => void>()

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
    dispatch: (request: TextMoodWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('분위기 분석 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<TextMoodWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  const embedding = classifierArtifact.primaryHead.weights.slice(0, TEXT_MOOD_MODEL.dimension)
  transformers.extract.mockResolvedValue({data: Float32Array.from(embedding)})
  transformers.pipeline.mockImplementation(
    async (_task: string, _model: string, options: MockPipelineOptions) => {
      options.progress_callback({
        files: {'model.onnx': {loaded: 64, total: 100}},
        loaded: 64,
        name: 'minilm',
        progress: 64,
        status: 'progress_total',
        total: 100,
      })
      return transformers.extract
    },
  )
})

describe('text mood worker', () => {
  it('should prepare the pinned q8 feature extraction model', async () => {
    const worker = await loadWorker()
    worker.dispatch({requestId: 7, type: 'prepare'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 7, type: 'ready'})
    })
    expect(worker.postMessage).toHaveBeenCalledWith({progress: 64, type: 'loading'})
    expect(transformers.pipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      expect.objectContaining({device: 'wasm', dtype: 'q8'}),
    )
    expect(transformers.env).toEqual({
      allowLocalModels: false,
      allowRemoteModels: true,
      remoteHost: 'https://pub-0e34511083544f8aaad14d0590013528.r2.dev/',
      remotePathTemplate: 'models/text-mood/{model}/2c4055b12046f11709e9df2c122e59ffbdc2f900/',
    })
  })

  it('should embed context and return a classified mood with elapsed time', async () => {
    const worker = await loadWorker()
    worker.dispatch({context: '앞 문장', requestId: 9, text: '현재 문장', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          analysis: expect.objectContaining({primary: expect.objectContaining({id: 'cheerful'})}),
          elapsedMilliseconds: expect.any(Number),
          requestId: 9,
          type: 'complete',
        }),
      )
    })
    expect(transformers.extract).toHaveBeenCalledWith('이전 대화: 앞 문장\n현재 문장: 현재 문장', {
      normalize: true,
      pooling: 'mean',
    })
  })

  it('should reject empty input without loading the model', async () => {
    const worker = await loadWorker()
    worker.dispatch({requestId: 11, text: '   ', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        error: {code: 'invalid-input', phase: 'analyze', retryable: false},
        requestId: 11,
        type: 'error',
      })
    })
    expect(transformers.pipeline).not.toHaveBeenCalled()
  })

  it('should stop after the learned insufficiency head using the same embedding', async () => {
    const {insufficiencyHead} = classifierArtifact
    const embedding = insufficiencyHead.hiddenWeights.slice(
      3 * TEXT_MOOD_MODEL.dimension,
      4 * TEXT_MOOD_MODEL.dimension,
    )
    const length = Math.hypot(...embedding)
    transformers.extract.mockResolvedValueOnce({
      data: Float32Array.from(embedding.map((value) => value / length)),
    })
    const worker = await loadWorker()
    worker.dispatch({requestId: 12, text: '뚜두둥', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 12,
          sufficiency: expect.objectContaining({insufficient: true, threshold: 0.94}),
          type: 'insufficient',
        }),
      )
    })
    expect(transformers.extract).toHaveBeenCalledOnce()
  })

  it('should return a structured model error for preparation failure', async () => {
    transformers.pipeline.mockRejectedValue(new Error('모델 다운로드 실패'))
    const worker = await loadWorker()
    worker.dispatch({requestId: 13, type: 'prepare'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        error: {
          code: 'model-failed',
          detail: '모델 다운로드 실패',
          phase: 'prepare',
          retryable: true,
        },
        requestId: 13,
        type: 'error',
      })
    })
  })

  it('should clamp progress, ignore unrelated progress, and reuse the prepared extractor', async () => {
    transformers.pipeline.mockImplementation(
      async (_task: string, _model: string, options: MockPipelineOptions) => {
        options.progress_callback({status: 'download'} as never)
        options.progress_callback({
          files: {},
          loaded: 0,
          name: 'minilm',
          progress: -10,
          status: 'progress_total',
          total: 100,
        })
        options.progress_callback({
          files: {},
          loaded: 100,
          name: 'minilm',
          progress: 110,
          status: 'progress_total',
          total: 100,
        })
        return transformers.extract
      },
    )
    const worker = await loadWorker()

    worker.dispatch({requestId: 20, type: 'prepare'})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 20, type: 'ready'}),
    )
    worker.dispatch({requestId: 21, type: 'prepare'})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 21, type: 'ready'}),
    )

    expect(worker.postMessage).toHaveBeenCalledWith({progress: 0, type: 'loading'})
    expect(worker.postMessage).toHaveBeenCalledWith({progress: 100, type: 'loading'})
    expect(transformers.pipeline).toHaveBeenCalledOnce()
  })

  it('should share an in-flight model preparation', async () => {
    let resolvePipeline: ((extractor: typeof transformers.extract) => void) | undefined
    transformers.pipeline.mockReturnValue(
      new Promise((resolve) => {
        resolvePipeline = resolve
      }),
    )
    const worker = await loadWorker()

    worker.dispatch({requestId: 22, type: 'prepare'})
    worker.dispatch({requestId: 23, type: 'prepare'})
    await vi.waitFor(() => expect(transformers.pipeline).toHaveBeenCalledOnce())
    resolvePipeline?.(transformers.extract)

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 22, type: 'ready'})
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 23, type: 'ready'})
    })
  })

  it('should reset a failed preparation before retrying', async () => {
    transformers.pipeline.mockRejectedValueOnce(new Error('temporary failure'))
    const worker = await loadWorker()

    worker.dispatch({requestId: 24, type: 'prepare'})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 24, type: 'error'}),
      ),
    )
    worker.dispatch({requestId: 25, type: 'prepare'})
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith({requestId: 25, type: 'ready'}),
    )

    expect(transformers.pipeline).toHaveBeenCalledTimes(2)
  })

  it('should analyze trimmed text without an empty context prefix', async () => {
    const worker = await loadWorker()

    worker.dispatch({context: '   ', requestId: 26, text: ' 현재 문장 ', type: 'analyze'})

    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({requestId: 26, type: 'complete'}),
      ),
    )
    expect(transformers.extract).toHaveBeenCalledWith('현재 문장', {
      normalize: true,
      pooling: 'mean',
    })
  })

  it('should report a model failure from an analysis request', async () => {
    transformers.pipeline.mockRejectedValue('unknown failure')
    const worker = await loadWorker()

    worker.dispatch({requestId: 27, text: '현재 문장', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'model-failed',
          detail: '알 수 없는 오류',
          phase: 'analyze',
          retryable: true,
        },
        requestId: 27,
        type: 'error',
      })
    })
  })

  it('should report when preparation resolves without an extractor', async () => {
    transformers.pipeline.mockResolvedValue(null)
    const worker = await loadWorker()

    worker.dispatch({requestId: 28, text: '현재 문장', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'model-failed',
          detail: '분위기 분석 모델이 준비되지 않았습니다.',
          phase: 'analyze',
          retryable: true,
        },
        requestId: 28,
        type: 'error',
      })
    })
  })

  it.each([
    [new Error('classification failed'), 'classification failed'],
    [new Error(''), '알 수 없는 오류'],
    ['unknown failure', '알 수 없는 오류'],
  ])('should report classification failures', async (error, detail) => {
    transformers.extract.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({requestId: 29, text: '현재 문장', type: 'analyze'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        error: {
          code: 'classification-failed',
          detail,
          phase: 'analyze',
          retryable: true,
        },
        requestId: 29,
        type: 'error',
      })
    })
  })

  it.each(['prepare', 'analyze'] as const)(
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
          ? ({requestId: 30, type} as const)
          : ({requestId: 30, text: '현재 문장', type} as const)

      worker.dispatch(request)

      await vi.waitFor(() => {
        expect(worker.postMessage).toHaveBeenLastCalledWith({
          error: {
            code: 'worker-failed',
            detail: 'post failed',
            phase: type,
            retryable: true,
          },
          requestId: 30,
          type: 'error',
        })
      })
    },
  )

  it('should reject an unsupported worker request', async () => {
    const worker = await loadWorker()

    expect(() => {
      worker.dispatch({requestId: 31, type: 'unsupported'} as unknown as TextMoodWorkerRequest)
    }).toThrow("Cannot read properties of undefined (reading 'catch')")
  })
})
