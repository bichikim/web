/** @vitest-environment node */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {GenerateTextOptions, TextGenerationRuntime} from '../features/text-generation'
import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../features/chat/messages'

const runtimeMocks = vi.hoisted(() => ({
  countTokens: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
  getTokenizer: vi.fn(),
  prepare: vi.fn(),
}))
const contextMocks = vi.hoisted(() => ({partitionChatHistory: vi.fn()}))
const promptMocks = vi.hoisted(() => ({
  createChatMessages: vi.fn(),
  createSummaryMessages: vi.fn(),
  limitChatAnswer: vi.fn(),
  takeChatAnswerPrefix: vi.fn(),
}))
const textMocks = vi.hoisted(() => ({trimRepetitiveTail: vi.fn()}))

vi.mock('../features/korean-text-postprocessor', () => ({
  containsForeignCjk: vi.fn(() => false),
  createForeignCjkTokenIds: vi.fn(),
  createKoreanRefinementMessages: vi.fn(),
  createKoreanTextSegments: vi.fn((text: string) => [{kind: 'text', text}]),
  replaceUnrefinedSentences: vi.fn(),
}))
vi.mock('../features/text-generation', () => ({trimRepetitiveTail: textMocks.trimRepetitiveTail}))
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
  messages: [{content: '첫 질문', id: 'user-1', role: 'user'}],
  summary: '',
}

const generateRequest = (
  replyId: string,
  content = '첫 질문',
): Extract<ChatWorkerRequest, {type: 'generate'}> => ({
  context: {
    messages: [{content, id: 'user-1', role: 'user'}],
    summary: '',
  },
  modelId: 'qwen-4b',
  refineAnswer: false,
  replyId,
  type: 'generate',
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
  await import('../features/chat/worker')

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
    options.onToken?.('답변')
    return ' 답변 '
  })
  textMocks.trimRepetitiveTail.mockImplementation((text: string) => text)
  promptMocks.createChatMessages.mockReturnValue([{content: 'chat', role: 'user'}])
  promptMocks.createSummaryMessages.mockReturnValue([{content: 'summary', role: 'user'}])
  promptMocks.limitChatAnswer.mockImplementation((text: string) => text)
  promptMocks.takeChatAnswerPrefix.mockImplementation((text: string) => text)
  contextMocks.partitionChatHistory.mockImplementation((messages: ChatContext['messages']) => ({
    messagesToSummarize: [],
    recentMessages: messages,
  }))
})

describe('bug hunt: chat worker concurrent generate', () => {
  it('should serialize generate requests so only one complete response is active', async () => {
    const firstGeneration = Promise.withResolvers<string>()
    const secondGeneration = Promise.withResolvers<string>()
    runtimeMocks.generate
      .mockImplementationOnce(async () => firstGeneration.promise)
      .mockImplementationOnce(async () => secondGeneration.promise)

    const worker = await loadWorker()
    worker.dispatch(generateRequest('reply-a'))
    worker.dispatch(generateRequest('reply-b', '둘째 질문'))

    firstGeneration.resolve(' 첫 답변 ')
    secondGeneration.resolve(' 둘째 답변 ')

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({content: '첫 답변', id: 'reply-a'}),
          type: 'complete',
        }),
      )
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({content: '둘째 답변', id: 'reply-b'}),
          type: 'complete',
        }),
      )
    })

    const completeResponses = worker.postMessage.mock.calls
      .map(([response]) => response)
      .filter((response): response is Extract<ChatWorkerResponse, {type: 'complete'}> => {
        return response.type === 'complete'
      })

    expect(completeResponses).toHaveLength(1)
  })
})
