import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import {createChatMessages} from './prompt'
import type {ChatClient, CreateChatClientOptions} from './client'

const MAXIMUM_NEW_TOKENS = 2048

export const createCloudChatClient = (options: CreateChatClientOptions): ChatClient => {
  const task = createCloudTextTask()
  return {
    dispose: task.dispose,
    generate: (context, replyId, generateOptions = {}) => {
      task.generate({
        maximumTokens: MAXIMUM_NEW_TOKENS,
        messages: createChatMessages({
          ...context,
          supplementaryContext: generateOptions.supplementaryContext,
        }),
        onComplete: (response) => {
          const message = {content: response.text, id: replyId, role: 'assistant'} as const
          options.onResponse({
            context: {...context, messages: [...context.messages, message]},
            contextTokens: response.tokenCount,
            message,
            type: 'complete',
            wasCompacted: false,
          })
        },
        onError: (message) => options.onResponse({message, restartRequired: false, type: 'error'}),
        onStarted: () =>
          options.onResponse({contextTokens: 0, type: 'started', wasCompacted: false}),
      })
    },
    prepare: () => options.onResponse({type: 'ready'}),
  }
}
