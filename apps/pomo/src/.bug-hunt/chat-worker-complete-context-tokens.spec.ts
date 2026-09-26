/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {successResult} from 'src/features/result'

import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from '../features/chat/messages'

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
vi.mock('../features/text-generation', () => ({
  createDeviceTarget: (modelId: string) => ({kind: 'device', modelId}),
  createGenerationFailure: (_error: unknown, message: string) => new Error(message),
  createRequestSequence: () => () => 'chat-request-1',
  trimRepetitiveTail: textMocks.trimRepetitiveTail,
}))
vi.mock('../features/text-generation/execution', () => ({
  createTextGenerationExecutor: () => ({
    countTokens: runtimeMocks.countTokens,
    generate: runtimeMocks.generate,
    getTokenizer: runtimeMocks.getTokenizer,
    prepare: runtimeMocks.prepare,
  }),
}))
vi.mock('../features/chat/context', () => ({
  partitionChatHistory: contextMocks.partitionChatHistory,
}))
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

const generateRequest = (): Extract<ChatWorkerRequest, {type: 'generate'}> => ({
  context,
  modelId: 'qwen-4b',
  refineAnswer: false,
  replyId: 'reply-1',
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

  runtimeMocks.prepare.mockResolvedValue(successResult(undefined))
  runtimeMocks.countTokens.mockResolvedValue(successResult(10))
  runtimeMocks.getTokenizer.mockReturnValue(successResult({tokenizer: true}))
  runtimeMocks.generate.mockImplementation(async (_request, handlers) => {
    handlers?.onResponse?.({text: '짧', type: 'token'})
    handlers?.onResponse?.({text: '은 답변', type: 'token'})
    return successResult(' 짧은 답변 ')
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

it('should count assistant reply tokens in the complete contextTokens payload', async () => {
  runtimeMocks.countTokens.mockReset()
  runtimeMocks.countTokens.mockImplementation(async (_target, messages) =>
    successResult(100 * messages.length),
  )
  const worker = await loadWorker()

  worker.dispatch(generateRequest())
  await vi.waitFor(() => {
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({type: 'complete'}))
  })

  const complete = worker.postMessage.mock.calls
    .map(([response]) => response)
    .find((response): response is Extract<ChatWorkerResponse, {type: 'complete'}> => {
      return response.type === 'complete'
    })

  expect(complete?.context.messages).toHaveLength(2)
  expect(complete?.contextTokens).toBe(200)
})
