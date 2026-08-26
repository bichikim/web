import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {KoreanTextSegment} from '../../korean-text-postprocessor'
import type {GenerateTextOptions, TextGenerationRuntime} from '../../text-generation'
import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../messages'

const koreanMocks = vi.hoisted(() => ({
  containsForeignCjk: vi.fn(),
  createForeignCjkTokenIds: vi.fn(),
  createKoreanRefinementMessages: vi.fn(),
  createKoreanTextSegments: vi.fn(),
  replaceUnrefinedSentences: vi.fn(),
}))
const textMocks = vi.hoisted(() => ({trimRepetitiveTail: vi.fn()}))
const contextMocks = vi.hoisted(() => ({partitionChatHistory: vi.fn()}))
const promptMocks = vi.hoisted(() => ({
  createChatMessages: vi.fn(),
  createSummaryMessages: vi.fn(),
  limitChatAnswer: vi.fn(),
  takeChatAnswerPrefix: vi.fn(),
}))
const runtimeMocks = vi.hoisted(() => ({
  countTokens: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('../../korean-text-postprocessor', () => ({
  containsForeignCjk: koreanMocks.containsForeignCjk,
  createForeignCjkTokenIds: koreanMocks.createForeignCjkTokenIds,
  createKoreanRefinementMessages: koreanMocks.createKoreanRefinementMessages,
  createKoreanTextSegments: koreanMocks.createKoreanTextSegments,
  replaceUnrefinedSentences: koreanMocks.replaceUnrefinedSentences,
}))
vi.mock('../../text-generation', () => ({trimRepetitiveTail: textMocks.trimRepetitiveTail}))
vi.mock('../../text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))
vi.mock('../context', () => ({partitionChatHistory: contextMocks.partitionChatHistory}))
vi.mock('../prompt', () => ({
  createChatMessages: promptMocks.createChatMessages,
  createSummaryMessages: promptMocks.createSummaryMessages,
  limitChatAnswer: promptMocks.limitChatAnswer,
  MAXIMUM_CHAT_ANSWER_CHARACTERS: 240,
  takeChatAnswerPrefix: promptMocks.takeChatAnswerPrefix,
}))

type WorkerMessageListener = (event: MessageEvent<ChatWorkerRequest>) => void

const context: ChatContext = {
  messages: [{content: '응원해 줘', id: 'user-1', role: 'user'}],
  summary: '',
}

const generateRequest = (
  overrides: Partial<Extract<ChatWorkerRequest, {type: 'generate'}>> = {},
): Extract<ChatWorkerRequest, {type: 'generate'}> => ({
  context,
  modelId: 'qwen-4b',
  refineAnswer: false,
  replyId: 'reply-1',
  type: 'generate',
  ...overrides,
})

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

const waitForResponse = async (
  worker: Awaited<ReturnType<typeof loadWorker>>,
  type: ChatWorkerResponse['type'],
) => {
  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({type}))
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllGlobals()

  const runtime = {
    countTokens: runtimeMocks.countTokens,
    generate: runtimeMocks.generate,
    getTokenizer: runtimeMocks.getTokenizer,
    prepare: runtimeMocks.prepare,
  } satisfies TextGenerationRuntime

  runtimeMocks.create.mockResolvedValue(runtime)
  runtimeMocks.prepare.mockResolvedValue(undefined)
  runtimeMocks.countTokens.mockResolvedValue(10)
  runtimeMocks.getTokenizer.mockReturnValue({tokenizer: true})
  runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
    options.onToken?.('기본 답변')
    return ' 기본 답변 '
  })
  textMocks.trimRepetitiveTail.mockImplementation((text: string) => text)
  promptMocks.createChatMessages.mockReturnValue([{content: 'chat', role: 'user'}])
  promptMocks.createSummaryMessages.mockReturnValue([{content: 'summary', role: 'user'}])
  promptMocks.limitChatAnswer.mockImplementation((text: string) => text)
  promptMocks.takeChatAnswerPrefix.mockImplementation((text: string, maximum: number) =>
    Array.from(text).slice(0, Math.max(0, maximum)).join(''),
  )
  contextMocks.partitionChatHistory.mockImplementation((messages: ChatContext['messages']) => ({
    messagesToSummarize: [],
    recentMessages: messages,
  }))
  koreanMocks.createKoreanTextSegments.mockImplementation((text: string) => [{kind: 'text', text}])
  koreanMocks.createForeignCjkTokenIds.mockReturnValue([17, 23])
  koreanMocks.createKoreanRefinementMessages.mockReturnValue([{content: 'refine', role: 'user'}])
  koreanMocks.containsForeignCjk.mockReturnValue(false)
  koreanMocks.replaceUnrefinedSentences.mockReturnValue('대체 문장')
})

describe('chat worker preparation', () => {
  it('should cache the runtime and forward loading progress while preparing models', async () => {
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await waitForResponse(worker, 'ready')
    const createOptions = runtimeMocks.create.mock.calls[0]?.[0]
    createOptions?.onProgress({file: 'model', progress: 0.5, status: 'progress'})
    worker.dispatch({modelId: 'gemma-4-e2b', type: 'prepare'})
    await vi.waitFor(() => expect(runtimeMocks.prepare).toHaveBeenCalledTimes(2))

    expect(runtimeMocks.create).toHaveBeenCalledOnce()
    expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(1, 'qwen-4b')
    expect(runtimeMocks.prepare).toHaveBeenNthCalledWith(2, 'gemma-4-e2b')
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({file: 'model', progress: 0.5, status: 'progress', type: 'loading'}),
    )
  })

  it.each([
    {error: new Error('준비 실패'), message: '준비 실패'},
    {error: new Error(), message: '채팅 모델을 실행하지 못했어요.'},
    {error: 'unknown failure', message: '채팅 모델을 실행하지 못했어요.'},
  ])('should report preparation errors as $message', async ({error, message}) => {
    runtimeMocks.prepare.mockRejectedValue(error)
    const worker = await loadWorker()

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        message,
        restartRequired: false,
        type: 'error',
      })
    })
  })
})

describe('chat worker context compaction', () => {
  it('should keep a context below the compaction threshold', async () => {
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(contextMocks.partitionChatHistory).not.toHaveBeenCalled()
    expect(worker.postMessage).toHaveBeenCalledWith({
      contextTokens: 10,
      type: 'started',
      wasCompacted: false,
    })
  })

  it('should keep an oversized context when there is no completed history to summarize', async () => {
    runtimeMocks.countTokens.mockResolvedValue(5_000)
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(contextMocks.partitionChatHistory).toHaveBeenCalledWith(context.messages)
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'compacting'})
  })

  it('should keep the original context when summarization returns empty text', async () => {
    runtimeMocks.countTokens.mockResolvedValueOnce(5_000).mockResolvedValueOnce(100)
    contextMocks.partitionChatHistory.mockReturnValue({
      messagesToSummarize: context.messages,
      recentMessages: [],
    })
    runtimeMocks.generate
      .mockResolvedValueOnce('   ')
      .mockImplementationOnce(async (options: GenerateTextOptions) => {
        options.onToken?.('답변')
        return '답변'
      })
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({type: 'compacting'})
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({summary: ''}),
        wasCompacted: false,
      }),
    )
  })

  it('should compact completed history into a summary', async () => {
    const recentMessages = [{content: '최근 질문', id: 'recent', role: 'user'}] as const
    runtimeMocks.countTokens.mockResolvedValueOnce(5_000).mockResolvedValueOnce(123)
    contextMocks.partitionChatHistory.mockReturnValue({
      messagesToSummarize: context.messages,
      recentMessages,
    })
    runtimeMocks.generate
      .mockResolvedValueOnce(' 새 요약 ')
      .mockImplementationOnce(async (options: GenerateTextOptions) => {
        options.onToken?.('압축 후 답변')
        return '압축 후 답변'
      })
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(promptMocks.createSummaryMessages).toHaveBeenCalledWith({
      messages: context.messages,
      previousSummary: '',
    })
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({summary: '새 요약'}),
        contextTokens: 123,
        wasCompacted: true,
      }),
    )
  })
})

describe('chat worker generation', () => {
  it('should stream only visible text and complete without refinement', async () => {
    runtimeMocks.generate.mockImplementation(async (options: GenerateTextOptions) => {
      options.onToken?.('보이는 답변')
      options.onToken?.('')
      return ' 보이는 답변 '
    })
    promptMocks.takeChatAnswerPrefix
      .mockImplementationOnce((text: string) => text)
      .mockReturnValueOnce('')
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({text: '보이는 답변', type: 'token'})
    expect(worker.postMessage).toHaveBeenCalledWith({
      draft: {content: '보이는 답변', id: 'reply-1'},
      type: 'draft',
    })
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
  })

  it('should surface generation failures through the worker error response', async () => {
    runtimeMocks.generate.mockRejectedValue(new Error('생성 실패'))
    const worker = await loadWorker()

    worker.dispatch(generateRequest())

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenLastCalledWith({
        message: '생성 실패',
        restartRequired: false,
        type: 'error',
      })
    })
  })

  it('should execute the exhaustive request guard for an unknown runtime request', async () => {
    const worker = await loadWorker()

    expect(() => {
      worker.dispatch({type: 'unknown'} as unknown as ChatWorkerRequest)
    }).toThrow("Cannot read properties of undefined (reading 'catch')")
  })
})

describe('chat worker Korean refinement', () => {
  it('should leave an answer unchanged when no segment needs refinement', async () => {
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
    expect(runtimeMocks.generate).toHaveBeenCalledOnce()
  })

  it('should preserve text segments and replace foreign CJK in refined segments', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([
      {kind: 'text', text: '앞 문장. '},
      {kind: 'refining', text: '나쁜 人生'},
    ])
    koreanMocks.containsForeignCjk.mockReturnValue(true)
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('여전히 人生')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({type: 'refining'})
    expect(koreanMocks.replaceUnrefinedSentences).toHaveBeenCalledWith('나쁜 人生')
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '앞 문장. 대체 문장'})}),
    )
  })

  it('should preserve leading whitespace when a refined segment becomes Korean', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: '  나쁜 人生'}])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '  좋은 하루'})}),
    )
    expect(runtimeMocks.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({suppressedTokenIds: [17, 23]}),
    )
  })

  it('should cache suppressed token ids across refined answers', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: '나쁜 人生'}])
    runtimeMocks.generate
      .mockResolvedValueOnce('나쁜 人生')
      .mockResolvedValueOnce('첫 답변')
      .mockResolvedValueOnce('또 나쁜 人生')
      .mockResolvedValueOnce('둘째 답변')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')
    worker.dispatch(generateRequest({refineAnswer: true, replyId: 'reply-2'}))
    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({message: expect.objectContaining({id: 'reply-2'})}),
      )
    })

    expect(koreanMocks.createForeignCjkTokenIds).toHaveBeenCalledOnce()
  })

  it('should handle a segment whose whitespace matcher returns no result', async () => {
    const unusualText = {
      match: vi.fn().mockReturnValue(null),
      toString: () => '나쁜 人生',
      trim: () => '나쁜 人生',
    } as unknown as string
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: unusualText}])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '좋은 하루'})}),
    )
  })

  it('should execute the exhaustive segment guard for malformed runtime data', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([
      {kind: 'refining', text: '나쁜 人生'},
      {kind: 'unknown', text: '무시'} as unknown as KoreanTextSegment,
    ])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '좋은 하루'})}),
    )
  })
})
