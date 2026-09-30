/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {partitionChatHistory} from '../features/chat/context'
import type {ChatMessage} from '../features/chat/messages'

const createMessages = (count: number): ReadonlyArray<ChatMessage> =>
  Array.from({length: count}, (_, index) => ({
    content: `message-${index}`,
    id: String(index),
    role: index % 2 === 0 ? 'user' : 'assistant',
  }))

/** Mirrors the early exit in `compactContext` when summarization is skipped. */
const wouldSkipCompaction = (messages: ReadonlyArray<ChatMessage>, tokenCount: number) => {
  const CONTEXT_COMPACTION_TOKENS = 4608
  if (tokenCount <= CONTEXT_COMPACTION_TOKENS) {
    return false
  }

  const {messagesToSummarize} = partitionChatHistory(messages)
  return messagesToSummarize.length === 0
}

describe('chat history partition compaction gap', () => {
  it('should expose completed turns for summarization when five messages exceed the token budget', () => {
    const messages = createMessages(5)
    const partition = partitionChatHistory(messages)

    expect(partition.recentMessages.map((message) => message.id)).toEqual(['0', '1', '2', '3', '4'])
    expect(partition.messagesToSummarize).toEqual([])

    expect(wouldSkipCompaction(messages, 5000)).toBe(true)

    // Completed turn 0-1 should be summarizable while retaining the latest four messages 1-4.
    expect(partition.messagesToSummarize.map((message) => message.id)).toEqual(['0', '1'])
    expect(partition.recentMessages.map((message) => message.id)).toEqual(['2', '3', '4'])
  })
})
