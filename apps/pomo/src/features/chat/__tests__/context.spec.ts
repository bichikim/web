/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {partitionChatHistory} from '../context'
import type {ChatMessage} from '../messages'

const createMessages = (count: number): ReadonlyArray<ChatMessage> =>
  Array.from({length: count}, (_, index) => ({
    content: `message-${index}`,
    id: String(index),
    role: index % 2 === 0 ? 'user' : 'assistant',
  }))

describe('partitionChatHistory', () => {
  it('should summarize complete turns while retaining a complete recent suffix', () => {
    const result = partitionChatHistory(createMessages(7))

    expect(result.messagesToSummarize.map((message) => message.id)).toEqual(['0', '1', '2', '3'])
    expect(result.recentMessages.map((message) => message.id)).toEqual(['4', '5', '6'])
  })

  it('should summarize one complete turn from a five-message history', () => {
    const result = partitionChatHistory(createMessages(5))

    expect(result.messagesToSummarize.map((message) => message.id)).toEqual(['0', '1'])
    expect(result.recentMessages.map((message) => message.id)).toEqual(['2', '3', '4'])
  })

  it('should keep a history at the retained count unchanged', () => {
    const messages = createMessages(4)

    expect(partitionChatHistory(messages)).toEqual({
      messagesToSummarize: [],
      recentMessages: messages,
    })
  })
})
