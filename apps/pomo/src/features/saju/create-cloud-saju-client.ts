import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import type {SajuClient} from './client'
import type {SajuGenerationResponse} from './generation-messages'

/** Generates a calculated reading through the cancellable cloud text service. */
export function createCloudSajuClient(
  onResponse: (response: SajuGenerationResponse) => void,
): SajuClient {
  const task = createCloudTextTask()
  return {
    dispose: task.dispose,
    generate: (request) => {
      task.generate({
        maximumTokens: 768,
        messages: request.messages,
        onComplete: (response) =>
          onResponse({requestId: request.requestId, text: response.text, type: 'complete'}),
        onError: (message) => onResponse({message, requestId: request.requestId, type: 'error'}),
        onStarted: () => onResponse({requestId: request.requestId, type: 'started'}),
      })
    },
  }
}
