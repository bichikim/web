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
  it('should retain complete recent turns when the latest user is unanswered', () => {
    const result = partitionChatHistory(createMessages(7))

    expect(result.messagesToSummarize.map((message) => message.id)).toEqual(['0', '1'])
    expect(result.recentMessages.map((message) => message.id)).toEqual(['2', '3', '4', '5', '6'])
  })

  it('should keep short conversations unchanged', () => {
    const messages = createMessages(3)

    expect(partitionChatHistory(messages)).toEqual({
      messagesToSummarize: [],
      recentMessages: messages,
    })
  })
})
