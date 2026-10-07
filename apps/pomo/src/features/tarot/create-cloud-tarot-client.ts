import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import {createTarotMessages} from './prompt'
import type {CreateTarotClientOptions, TarotClient} from './client'

const MAXIMUM_NEW_TOKENS = 2560

export const createCloudTarotClient = (options: CreateTarotClientOptions): TarotClient => {
  const task = createCloudTextTask()
  return {
    dispose: task.dispose,
    generate: (request) => {
      task.generate({
        maximumTokens: MAXIMUM_NEW_TOKENS,
        messages: createTarotMessages(request),
        onComplete: (response) =>
          options.onResponse({requestId: request.requestId, text: response.text, type: 'complete'}),
        onError: (message) =>
          options.onResponse({
            message,
            requestId: request.requestId,
            restartRequired: false,
            type: 'error',
          }),
        onStarted: () => options.onResponse({requestId: request.requestId, type: 'started'}),
      })
    },
  }
}
