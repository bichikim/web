import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {QwenWorkerRequest, QwenWorkerResponse} from '../messages'

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

type WorkerMessageListener = (event: MessageEvent<QwenWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  generate: vi.fn(),
  modelFromPretrained: vi.fn(),
  processorFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: transformers.processorFromPretrained},
  Qwen3_5ForCausalLM: {from_pretrained: transformers.modelFromPretrained},
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
  const postMessage = vi.fn<(response: QwenWorkerResponse) => void>()

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
    dispatch: (request: QwenWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('Qwen Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<QwenWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  transformers.modelFromPretrained.mockImplementation(
    async (_repositoryId: string, options: MockModelOptions) => {
      options.progress_callback({
        files: {'model.onnx': {loaded: 50, total: 100}},
        loaded: 50,
        status: 'progress_total',
        total: 100,
      })
      return {generate: transformers.generate}
    },
  )
  transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
    options.streamer.emit('행복은 가까이에 있어요.')
  })
})

describe('Qwen dialogue worker', () => {
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
})
