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
})
