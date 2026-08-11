import type {ChatMessage} from './messages'

const RETAINED_MESSAGE_COUNT = 4

export interface ChatHistoryPartition {
  readonly messagesToSummarize: ReadonlyArray<ChatMessage>
  readonly recentMessages: ReadonlyArray<ChatMessage>
}

/** Splits completed chat turns without separating a user message from its answer. */
export const partitionChatHistory = (
  messages: ReadonlyArray<ChatMessage>,
): ChatHistoryPartition => {
  const requestedStart = Math.max(0, messages.length - RETAINED_MESSAGE_COUNT)
  const recentStart = requestedStart - (requestedStart % 2)

  return {
    messagesToSummarize: messages.slice(0, recentStart),
    recentMessages: messages.slice(recentStart),
  }
}
