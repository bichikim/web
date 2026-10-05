/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import type {GenerateTextOptions} from '../../text-generation'
import {
  context,
  contextMocks,
  generateRequest,
  loadWorker,
  promptMocks,
  runtimeMocks,
  waitForResponse,
} from './fixtures/worker'

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

  it('should include the completed assistant message in context token count', async () => {
    const assistantMessage = {content: '기본 답변', id: 'reply-1', role: 'assistant'} as const
    const tokenCounts = [10, 100, 200]
    runtimeMocks.countTokens.mockImplementation(async () => tokenCounts.shift() ?? 10)
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({
      contextTokens: 100,
      type: 'started',
      wasCompacted: false,
    })
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {messages: [...context.messages, assistantMessage], summary: ''},
        contextTokens: 200,
        type: 'complete',
      }),
    )
    expect(promptMocks.createChatMessages).toHaveBeenCalledWith({
      messages: [...context.messages, assistantMessage],
      summary: '',
      supplementaryContext: undefined,
    })
  })

  it('should complete the answer when completed-context token counting fails', async () => {
    const assistantMessage = {content: '기본 답변', id: 'reply-1', role: 'assistant'} as const
    const tokenCounts = [10, 100]
    runtimeMocks.countTokens.mockImplementation(async () => {
      const tokenCount = tokenCounts.shift()
      if (tokenCount === undefined) {
        throw new Error('토큰 수 계산 실패')
      }

      return tokenCount
    })
    const worker = await loadWorker()

    worker.dispatch(generateRequest())
    await waitForResponse(worker, 'complete')

    expect(runtimeMocks.countTokens).toHaveBeenCalledTimes(3)
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {messages: [...context.messages, assistantMessage], summary: ''},
        contextTokens: 100,
        type: 'complete',
      }),
    )
    expect(worker.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({type: 'error'}))
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
    runtimeMocks.countTokens
      .mockResolvedValueOnce(5_000)
      .mockResolvedValueOnce(123)
      .mockResolvedValueOnce(456)
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
        contextTokens: 456,
        wasCompacted: true,
      }),
    )
  })
})
