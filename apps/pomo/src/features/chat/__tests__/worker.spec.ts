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
  tokenizerFromPretrained: vi.fn(),
}))

vi.mock('@huggingface/transformers', () => ({
  AutoTokenizer: {from_pretrained: transformers.tokenizerFromPretrained},
  env: {},
  Gemma4ForCausalLM: {from_pretrained: transformers.modelFromPretrained},
  Qwen3_5ForCausalLM: {from_pretrained: transformers.modelFromPretrained},
  TextStreamer: class {
    readonly emit: (text: string) => void

    constructor(_tokenizer: unknown, options: MockStreamerOptions) {
      this.emit = options.callback_function
    }
  },
}))

const createTokenizer = () => {
  const tokenTexts = new Map([
    [0, '<special>'],
    [1, '한글'],
    [2, '人生'],
  ])
  return Object.assign(
    vi.fn(async () => ({input_ids: {dims: [1, 24]}})),
    {
      all_special_ids: [0],
      apply_chat_template: vi.fn(() => '완성된 프롬프트'),
      decode: (tokenIds: Array<number>) => tokenTexts.get(tokenIds[0] ?? 0) ?? '',
      get_vocab: () => new Map([...tokenTexts.keys()].map((tokenId) => [String(tokenId), tokenId])),
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

  transformers.tokenizerFromPretrained.mockResolvedValue(createTokenizer())
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
      refineAnswer: true,
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
    expect(worker.postMessage).toHaveBeenCalledWith({
      draft: {content: '작은 성공을 하나씩 쌓아 보세요.', id: 'reply-1'},
      type: 'draft',
    })
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
      refineAnswer: true,
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
    expect(worker.postMessage).toHaveBeenCalledWith({
      draft: {
        content: '첫 문장은 유지해요. 작은 성공一次次 쌓아 보세요. 마지막 문장도 유지해요.',
        id: 'reply-1',
      },
      type: 'draft',
    })
    expect(transformers.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({suppress_tokens: [2]}),
    )
  })

  it('should skip refinement and complete with the original draft when disabled', async () => {
    transformers.generate.mockImplementationOnce(async (options: MockGenerateOptions) => {
      options.streamer.emit('다듬지 않은 人生 답변이에요.')
    })
    const worker = await loadWorker()

    worker.dispatch({
      context: {
        messages: [{content: '바로 답해 줘', id: 'user-1', role: 'user'}],
        summary: '',
      },
      modelId: 'qwen-4b',
      refineAnswer: false,
      replyId: 'reply-1',
      type: 'generate',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({content: '다듬지 않은 人生 답변이에요.'}),
          type: 'complete',
        }),
      )
    })
    expect(transformers.generate).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
  })

  it('should enforce the answer limit in streaming and completed output', async () => {
    transformers.generate.mockImplementationOnce(async (options: MockGenerateOptions) => {
      options.streamer.emit('가'.repeat(300))
    })
    const worker = await loadWorker()

    worker.dispatch({
      context: {
        messages: [{content: '아주 길게 답해 줘', id: 'user-1', role: 'user'}],
        summary: '',
      },
      modelId: 'qwen-4b',
      refineAnswer: false,
      replyId: 'reply-1',
      type: 'generate',
    })

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({type: 'complete'}),
      )
    })
    const responses = worker.postMessage.mock.calls.map(([response]) => response)
    const streamedText = responses
      .filter((response) => response.type === 'token')
      .map((response) => response.text)
      .join('')
    const completeResponse = responses.find((response) => response.type === 'complete')

    expect(Array.from(streamedText)).toHaveLength(240)
    expect(completeResponse).toEqual(
      expect.objectContaining({
        message: expect.objectContaining({content: `${'가'.repeat(239)}…`}),
      }),
    )
    expect(transformers.generate).toHaveBeenCalledWith(
      expect.objectContaining({max_new_tokens: 256}),
    )
  })
})
