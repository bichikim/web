/** @vitest-environment node */
/**
 * Bug hunt: dialogue-writer worker concurrent generate requests.
 * Distinct from #1662 (chat worker duplicate complete).
 */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {
  DialogueWorkerRequest,
  DialogueWorkerResponse,
} from '../features/dialogue-writer/messages'

interface MockGenerateOptions {
  readonly streamer: {readonly emit: (text: string) => void}
}

type WorkerMessageListener = (event: MessageEvent<DialogueWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  environment: {},
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
    constructor(
      _tokenizer: unknown,
      options: {readonly callback_function: (text: string) => void},
    ) {
      this.emit = options.callback_function
    }
    readonly emit: (text: string) => void
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
      apply_chat_template: vi.fn(() => 'prompt'),
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
  await import('../features/dialogue-writer/worker')

  return {
    dispatch: (request: DialogueWorkerRequest) => {
      messageListener?.({data: request} as MessageEvent<DialogueWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  const loadModel = async (
    _repositoryId: string,
    options: {
      readonly progress_callback: (progress: {
        readonly files: Readonly<Record<string, {readonly loaded: number; readonly total: number}>>
        readonly loaded: number
        readonly status: 'progress_total'
        readonly total: number
      }) => void
    },
  ) => {
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
})

describe('dialogue writer worker overlap', () => {
  it('should emit only one complete for the latest overlapping generate request', async () => {
    let generateCount = 0
    const firstGenerate = Promise.withResolvers<void>()
    const secondGenerate = Promise.withResolvers<void>()

    transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
      generateCount += 1
      if (generateCount === 1) {
        await firstGenerate.promise
        options.streamer.emit('첫 번째 답변.')
        return
      }
      await secondGenerate.promise
      options.streamer.emit('두 번째 답변.')
    })

    const worker = await loadWorker()
    worker.dispatch({modelId: 'qwen-0.8b', request: '첫 질문', type: 'generate'})
    worker.dispatch({modelId: 'qwen-0.8b', request: '둘째 질문', type: 'generate'})

    firstGenerate.resolve()
    await vi.waitFor(() =>
      expect(worker.postMessage.mock.calls.some(([response]) => response.type === 'complete')).toBe(
        true,
      ),
    )
    secondGenerate.resolve()
    await vi.waitFor(() =>
      expect(
        worker.postMessage.mock.calls.filter(([response]) => response.type === 'complete'),
      ).toHaveLength(2),
    )

    const completes = worker.postMessage.mock.calls
      .filter(([response]) => response.type === 'complete')
      .map(([response]) => response)

    expect(completes).toHaveLength(1)
    expect(completes[0]).toMatchObject({text: '두 번째 답변.', type: 'complete'})
  })
})
