import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {ChatWorkerRequest, ChatWorkerResponse} from '../messages'

interface MockGenerateOptions {
  readonly streamer: {readonly emit: (text: string) => void}
  readonly suppress_tokens?: Array<number>
}

interface MockStreamerOptions {
  readonly callback_function: (text: string) => void
}

type WorkerMessageListener = (event: MessageEvent<ChatWorkerRequest>) => void

const transformers = vi.hoisted(() => ({
  generate: vi.fn(),
  modelFromPretrained: vi.fn(),
  processorFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoProcessor: {from_pretrained: transformers.processorFromPretrained},
  env: {},
  Qwen3_5ForCausalLM: {from_pretrained: transformers.modelFromPretrained},
  TextStreamer: class {
    readonly emit: (text: string) => void

    constructor(_tokenizer: unknown, options: MockStreamerOptions) {
      this.emit = options.callback_function
    }
  },
}))

const createProcessor = () => {
  const tokenTexts = new Map([
    [0, '<special>'],
    [1, '한글'],
    [2, '人生'],
  ])
  const tokenizer = {
    all_special_ids: [0],
    decode: (tokenIds: Array<number>) => tokenTexts.get(tokenIds[0] ?? 0) ?? '',
    get_vocab: () => new Map([...tokenTexts.keys()].map((tokenId) => [String(tokenId), tokenId])),
  }

  return Object.assign(
    vi.fn(async () => ({input_ids: {dims: [1, 24]}})),
    {
      apply_chat_template: vi.fn(() => '완성된 프롬프트'),
      tokenizer,
    },
  )
}

const loadWorker = async () => {
  let messageListener: WorkerMessageListener | null = null
  const postMessage = vi.fn<(response: ChatWorkerResponse) => void>()

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
    dispatch: (request: ChatWorkerRequest) => {
      if (messageListener === null) {
        throw new Error('채팅 Worker 메시지 리스너가 등록되지 않았습니다.')
      }

      messageListener({data: request} as MessageEvent<ChatWorkerRequest>)
    },
    postMessage,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  transformers.processorFromPretrained.mockResolvedValue(createProcessor())
  transformers.modelFromPretrained.mockResolvedValue({generate: transformers.generate})
  transformers.generate.mockImplementation(async (options: MockGenerateOptions) => {
    options.streamer.emit('작은 성공을 하나씩 쌓아 보세요.')
  })
})

describe('chat worker', () => {
  it('should complete clean Korean without a refinement pass', async () => {
    const worker = await loadWorker()

    worker.dispatch({
      context: {
        messages: [{content: '응원해 줘', id: 'user-1', role: 'user'}],
        summary: '',
      },
      modelId: 'qwen-4b',
      replyId: 'reply-1',
      type: 'generate',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({content: '작은 성공을 하나씩 쌓아 보세요.'}),
          type: 'complete',
        }),
      )
    })
    expect(transformers.generate).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
  })

  it('should conceal and rewrite an answer containing Han characters', async () => {
    transformers.generate
      .mockImplementationOnce(async (options: MockGenerateOptions) => {
        options.streamer.emit(
          '첫 문장은 유지해요. 작은 성공一次次 쌓아 보세요. 마지막 문장도 유지해요.',
        )
      })
      .mockImplementationOnce(async (options: MockGenerateOptions) => {
        options.streamer.emit('작은 성공을 하나씩 쌓아 보세요.')
      })
    const worker = await loadWorker()

    worker.dispatch({
      context: {
        messages: [{content: '응원해 줘', id: 'user-1', role: 'user'}],
        summary: '',
      },
      modelId: 'qwen-4b',
      replyId: 'reply-1',
      type: 'generate',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            content: '첫 문장은 유지해요. 작은 성공을 하나씩 쌓아 보세요. 마지막 문장도 유지해요.',
          }),
          type: 'complete',
        }),
      )
    })
    expect(worker.postMessage).toHaveBeenCalledWith({type: 'refining'})
    expect(transformers.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({suppress_tokens: [2]}),
    )
  })
})
