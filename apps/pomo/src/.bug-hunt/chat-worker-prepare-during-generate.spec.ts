/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../features/chat/messages'
import type {TextGenerationRuntime} from '../features/text-generation'

vi.mock('@paraglide/message', () => ({}))

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

vi.mock('../features/korean-text-postprocessor', () => ({
  containsForeignCjk: koreanMocks.containsForeignCjk,
  createForeignCjkTokenIds: koreanMocks.createForeignCjkTokenIds,
  createKoreanRefinementMessages: koreanMocks.createKoreanRefinementMessages,
  createKoreanTextSegments: koreanMocks.createKoreanTextSegments,
  replaceUnrefinedSentences: koreanMocks.replaceUnrefinedSentences,
}))
vi.mock('../features/text-generation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/text-generation')>()),
  trimRepetitiveTail: textMocks.trimRepetitiveTail,
}))
vi.mock('../features/text-generation/transformers-runtime', () => ({
  createTransformersRuntime: runtimeMocks.create,
}))
vi.mock('../features/chat/context', () => ({partitionChatHistory: contextMocks.partitionChatHistory}))
vi.mock('../features/chat/prompt', () => ({
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
  await import('../features/chat/worker')

  return {
    dispatch: (request: ChatWorkerRequest) => {
      messageListener?.({data: request} as MessageEvent<ChatWorkerRequest>)
    },
    postMessage,
  }
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
  runtimeMocks.countTokens.mockResolvedValue(1)
  runtimeMocks.getTokenizer.mockReturnValue({
    all_special_ids: [0],
    decode: () => '한글',
    get_vocab: () => new Map([['한글', 1]]),
  })
  runtimeMocks.generate.mockResolvedValue('답변')
  textMocks.trimRepetitiveTail.mockImplementation((text: string) => text)
  contextMocks.partitionChatHistory.mockReturnValue({
    messagesToSummarize: [],
    recentMessages: context.messages,
  })
  promptMocks.createChatMessages.mockReturnValue([])
  promptMocks.createSummaryMessages.mockReturnValue([])
  promptMocks.limitChatAnswer.mockImplementation((text: string) => text)
  promptMocks.takeChatAnswerPrefix.mockImplementation((text: string) => text)
  koreanMocks.containsForeignCjk.mockReturnValue(false)
})

describe('chat worker prepare during generate', () => {
  it('should not post ready while a generate request is still in flight', async () => {
    const generation = Promise.withResolvers<void>()
    runtimeMocks.generate.mockImplementationOnce(async () => {
      await generation.promise
      return '답변'
    })
    const worker = await loadWorker()

    worker.dispatch({
      context,
      modelId: 'qwen-4b',
      refineAnswer: false,
      replyId: 'reply-1',
      type: 'generate',
    })
    await vi.waitFor(() => expect(runtimeMocks.generate).toHaveBeenCalledOnce())

    worker.dispatch({modelId: 'qwen-4b', type: 'prepare'})
    await vi.waitFor(() => {
      expect(worker.postMessage.mock.calls.map(([response]) => response.type)).toContain('ready')
    })
    expect(worker.postMessage.mock.calls.map(([response]) => response.type)).not.toContain(
      'complete',
    )
    expect(worker.postMessage.mock.calls.map(([response]) => response.type)).not.toContain('ready')

    generation.resolve()
    await vi.waitFor(() => {
      expect(worker.postMessage.mock.calls.some(([response]) => response.type === 'complete')).toBe(
        true,
      )
    })
  })
})
