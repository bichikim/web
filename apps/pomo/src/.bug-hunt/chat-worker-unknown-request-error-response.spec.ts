/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {ChatWorkerRequest, ChatWorkerResponse} from '../features/chat/messages'
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
})

describe('chat worker unknown request', () => {
  it('should post an error response for an unsupported request type', async () => {
    const worker = await loadWorker()

    worker.dispatch({type: 'unknown'} as unknown as ChatWorkerRequest)

    await vi.waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledWith({
        message: expect.any(String),
        restartRequired: false,
        type: 'error',
      })
    })
  })
})
