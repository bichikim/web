/// <reference lib="webworker" />

// oxlint-disable no-await-in-loop -- Contaminated sentences share one WebGPU model and must be refined sequentially.

import {
  containsForeignCjk,
  createForeignCjkTokenIds,
  createKoreanRefinementMessages,
  createKoreanTextSegments,
  type KoreanTextSegment,
  replaceUnrefinedSentences,
} from '../korean-text-postprocessor'
import {
  createTextGenerationRuntime,
  type TextGenerationMessage,
  type TextModelId,
  trimRepetitiveTail,
} from '../text-generation'
import {partitionChatHistory} from './context'
import type {ChatContext, ChatMessage, ChatWorkerRequest, ChatWorkerResponse} from './messages'
import {createChatMessages, createSummaryMessages} from './prompt'

const CONTEXT_COMPACTION_TOKENS = 4608
const MAXIMUM_ANSWER_TOKENS = 768
const MAXIMUM_SUMMARY_TOKENS = 384
const workerScope = self as DedicatedWorkerGlobalScope

const sendResponse = (response: ChatWorkerResponse) => workerScope.postMessage(response)
const textRuntime = createTextGenerationRuntime({
  onProgress: (progress) => sendResponse({...progress, type: 'loading'}),
})
let suppressedCjkTokenIds: Array<number> | null = null

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return '채팅 모델을 실행하지 못했어요.'
}

const prepareModel = async (modelId: TextModelId) => {
  await textRuntime.prepare(modelId)
  sendResponse({type: 'ready'})
}

const countPromptTokens = (context: ChatContext) =>
  textRuntime.countTokens(createChatMessages(context))

interface GenerateChatTextOptions {
  readonly maximumTokens: number
  readonly messages: Array<TextGenerationMessage>
  readonly onToken?: (text: string) => void
  readonly suppressedTokenIds?: Array<number>
}

const generateText = async (options: GenerateChatTextOptions) => {
  const output = await textRuntime.generate({
    maximumTokens: options.maximumTokens,
    messages: options.messages,
    noRepeatNgramSize: 4,
    onToken: options.onToken,
    repetitionPenalty: 1.1,
    suppressedTokenIds: options.suppressedTokenIds,
    temperature: 0.65,
    topK: 40,
    topP: 0.9,
  })

  return trimRepetitiveTail(output).trim()
}

const refineKoreanSegment = async (
  segment: KoreanTextSegment,
  suppressedTokenIds: Array<number>,
) => {
  switch (segment.kind) {
    case 'refining': {
      const leadingWhitespace = segment.text.match(/^\s*/u)?.[0] ?? ''
      const refinedText = await generateText({
        maximumTokens: MAXIMUM_ANSWER_TOKENS,
        messages: createKoreanRefinementMessages(segment.text.trim()),
        suppressedTokenIds,
      })
      return containsForeignCjk(refinedText)
        ? replaceUnrefinedSentences(segment.text)
        : `${leadingWhitespace}${refinedText}`
    }
    case 'text':
      return segment.text
  }

  segment satisfies never
}

const refineKoreanAnswer = async (text: string) => {
  const segments = createKoreanTextSegments(text)

  if (!segments.some((segment) => segment.kind === 'refining')) {
    return text
  }

  sendResponse({type: 'refining'})
  suppressedCjkTokenIds ??= createForeignCjkTokenIds(textRuntime.getTokenizer())
  const refinedSegments: Array<string> = []

  for (const segment of segments) {
    refinedSegments.push(await refineKoreanSegment(segment, suppressedCjkTokenIds))
  }

  return refinedSegments.join('')
}

interface CompactedContext {
  readonly context: ChatContext
  readonly wasCompacted: boolean
}

const compactContext = async (context: ChatContext): Promise<CompactedContext> => {
  const tokenCount = await countPromptTokens(context)

  if (tokenCount <= CONTEXT_COMPACTION_TOKENS) {
    return {context, wasCompacted: false}
  }

  const {messagesToSummarize, recentMessages} = partitionChatHistory(context.messages)

  if (messagesToSummarize.length === 0) {
    return {context, wasCompacted: false}
  }

  sendResponse({type: 'compacting'})
  const summary = await generateText({
    maximumTokens: MAXIMUM_SUMMARY_TOKENS,
    messages: createSummaryMessages({
      messages: messagesToSummarize,
      previousSummary: context.summary,
    }),
  })

  if (summary.length === 0) {
    return {context, wasCompacted: false}
  }

  return {
    context: {messages: recentMessages, summary},
    wasCompacted: true,
  }
}

const generateAnswer = async (modelId: TextModelId, context: ChatContext, replyId: string) => {
  await textRuntime.prepare(modelId)

  const compacted = await compactContext(context)
  const contextTokens = await countPromptTokens(compacted.context)
  sendResponse({contextTokens, type: 'started', wasCompacted: compacted.wasCompacted})
  const generatedText = await generateText({
    maximumTokens: MAXIMUM_ANSWER_TOKENS,
    messages: createChatMessages(compacted.context),
    onToken: (token) => sendResponse({text: token, type: 'token'}),
  })
  const text = await refineKoreanAnswer(generatedText)
  const message: ChatMessage = {content: text, id: replyId, role: 'assistant'}

  sendResponse({
    context: {
      messages: [...compacted.context.messages, message],
      summary: compacted.context.summary,
    },
    contextTokens,
    message,
    type: 'complete',
    wasCompacted: compacted.wasCompacted,
  })
}

const handleRequest = (request: ChatWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'generate':
      return generateAnswer(request.modelId, request.context, request.replyId)
    case 'prepare':
      return prepareModel(request.modelId)
  }

  request satisfies never
}

workerScope.addEventListener('message', (event: MessageEvent<ChatWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({message: getErrorMessage(error), restartRequired: false, type: 'error'})
  })
})
