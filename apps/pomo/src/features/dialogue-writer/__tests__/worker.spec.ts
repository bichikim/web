import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {DialogueWorkerRequest, DialogueWorkerResponse} from '../messages'

interface MockGenerateOptions {
  readonly streamer: {readonly emit: (text: string) => void}
}

interface MockModelOptions {
  readonly progress_callback: (progress: {
    readonly files: Readonly<Record<string, {readonly loaded: number; readonly total: number}>>
    readonly loaded: number
    readonly status: 'progress_total'
    readonly total: number
  }) => void
}

interface MockStreamerOptions {
  readonly callback_function: (text: string) => void
}

interface MockTransformersCache {
  readonly match: (request: string) => Promise<Response | undefined>
}

interface MockTransformersEnvironment {
  customCache?: MockTransformersCache
}

type WorkerMessageListener = (event: MessageEvent<DialogueWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  environment: {} as MockTransformersEnvironment,
  gemmaModelFromPretrained: vi.fn(),
  generate: vi.fn(),
  processorFromPretrained: vi.fn(),
  qwenModelFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: transformers.processorFromPretrained},
  env: transformers.environment,
  Gemma4ForCausalLM: {from_pretrained: transformers.gemmaModelFromPretrained},
  Qwen3_5ForCausalLM: {from_pretrained: transformers.qwenModelFromPretrained},
  TextStreamer: class {
    readonly emit: (text: string) => void

    constructor(_tokenizer: unknown, options: MockStreamerOptions) {
      this.emit = options.callback_function
    }
  },
}))

const createProcessor = () => {
  const tokenizer = {
    all_special_ids: [0],
    decode: () => '한글',
    get_vocab: () => new Map([['한글', 1]]),
  }

  return Object.assign(
    vi.fn(async () => ({input_ids: [1]})),
    {
      apply_chat_template: vi.fn(() => '완성된 프롬프트'),
      tokenizer,
    },
  )
}

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: DialogueWorkerResponse) => void>()

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
    dispatch: (request: DialogueWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('대화문 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<DialogueWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  const loadModel = async (_repositoryId: string, options: MockModelOptions) => {
    options.progress_callback({
      files: {'model.onnx': {loaded: 50, total: 100}},
      loaded: 50,
      status: 'progress_total',
      total: 100,
    })
    return {generate: transformers.generate}
  }
  transformers.gemmaModelFromPretrained.mockImplementation(loadModel)
  transformers.qwenModelFromPretrained.mockImplementation(loadModel)
  transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
    options.streamer.emit('행복은 가까이에 있어요.')
  })
})

describe('dialogue writer worker', () => {
  it('should report aggregate loading progress and readiness during preparation', async () => {
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-0.8b', type: 'prepare'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'})
    })
    expect(worker.postMessage).toHaveBeenCalledWith({
      files: [{fileName: 'model.onnx', loadedBytes: 50, percentage: 50, totalBytes: 100}],
      loadedBytes: 50,
      percentage: 50,
      totalBytes: 100,
      type: 'loading',
    })
  })

  it('should not re-enable the UI between generation start and completion', async () => {
    const worker = await loadWorker()
    worker.dispatch({modelId: 'qwen-2b', type: 'prepare'})
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledWith({type: 'ready'}))
    worker.postMessage.mockClear()

    worker.dispatch({modelId: 'qwen-2b', request: '삶의 행복에 대해 이야기해줘', type: 'generate'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        text: '행복은 가까이에 있어요.',
        type: 'complete',
      })
    })
    expect(worker.postMessage.mock.calls.map(([response]) => response.type)).toEqual([
      'started',
      'token',
      'complete',
    ])
  })

  it('should load Gemma with its text-only causal model runtime', async () => {
    const cache = {
      delete: vi.fn(async () => true),
      match: vi.fn(async (): Promise<Response | undefined> => undefined),
      put: vi.fn(async () => undefined),
    }
    vi.stubGlobal('caches', {open: vi.fn(async () => cache)})
    const worker = await loadWorker()

    worker.dispatch({modelId: 'gemma-4-e2b', type: 'prepare'})

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'}))
    expect(transformers.gemmaModelFromPretrained).toHaveBeenCalledWith(
      'onnx-community/gemma-4-E2B-it-ONNX',
      expect.objectContaining({
        device: 'webgpu',
        dtype: {decoder_model_merged: 'q4', embed_tokens: 'q4'},
        revision: '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6',
      }),
    )
    expect(transformers.processorFromPretrained).toHaveBeenCalledWith(
      'onnx-community/gemma-4-E2B-it-ONNX',
      {revision: '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6'},
    )
    expect(transformers.environment).toMatchObject({
      allowLocalModels: false,
      allowRemoteModels: true,
      remoteHost: 'https://storage.pomofi.io/',
      remotePathTemplate: 'models/text-generation/{model}/{revision}/',
    })
    const customCache = transformers.environment.customCache
    expect(customCache).toBeDefined()
    await customCache?.match(
      'https://storage.pomofi.io/models/text-generation/onnx-community/gemma-4-E2B-it-ONNX/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6/tokenizer.json',
    )
    expect(cache.match).toHaveBeenCalledWith(
      'https://storage.pomofi.io/models/text-generation/onnx-community/gemma-4-E2B-it-ONNX/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6/tokenizer.json?pomo-cache-version=1',
    )
    expect(transformers.qwenModelFromPretrained).not.toHaveBeenCalled()
  })

  it('should load mobile Gemma with q2f16 text sessions', async () => {
    const worker = await loadWorker()

    worker.dispatch({modelId: 'gemma-4-e2b-mobile', type: 'prepare'})

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenLastCalledWith({type: 'ready'}))
    expect(transformers.gemmaModelFromPretrained).toHaveBeenCalledWith(
      'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
      expect.objectContaining({
        device: 'webgpu',
        dtype: {decoder_model_merged: 'q2f16', embed_tokens: 'q2f16'},
        revision: 'main',
      }),
    )
    expect(transformers.environment).toMatchObject({
      remoteHost: 'https://huggingface.co/',
      remotePathTemplate: '{model}/resolve/{revision}/',
    })
  })

  it('should reuse the runtime and suppressed foreign token ids', async () => {
    const worker = await loadWorker()
    const request = {modelId: 'qwen-0.8b', request: '행복을 말해줘', type: 'generate'} as const

    worker.dispatch(request)
    await vi.waitFor(() =>
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({type: 'complete'}),
      ),
    )
    worker.dispatch(request)
    await vi.waitFor(() => {
      expect(
        worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
      ).toHaveLength(2)
    })

    expect(transformers.qwenModelFromPretrained).toHaveBeenCalledOnce()
  })

  it.each([
    [new Error('generation failed'), 'generation failed'],
    [new Error(''), '대화문 모델을 실행하지 못했어요.'],
    ['unknown failure', '대화문 모델을 실행하지 못했어요.'],
  ])('should report generation failures without requiring a restart', async (error, message) => {
    transformers.generate.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-0.8b', request: '행복을 말해줘', type: 'generate'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        message,
        restartRequired: false,
        type: 'error',
      })
    })
  })

  it('should reject an unsupported worker request', async () => {
    const worker = await loadWorker()

    expect(() => {
      worker.dispatch({type: 'unsupported'} as unknown as DialogueWorkerRequest)
    }).toThrow("Cannot read properties of undefined (reading 'catch')")
  })
})
