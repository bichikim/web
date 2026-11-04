import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import type {SajuClient} from './client'
import type {SajuGenerationResponse} from './generation-messages'
import {formatSajuAnswer} from './format-answer'

/** Generates a calculated reading through the cancellable cloud text service. */
export function createCloudSajuClient(
  onResponse: (response: SajuGenerationResponse) => void,
): SajuClient {
  const task = createCloudTextTask()
  return {
    dispose: task.dispose,
    generate: (request) => {
      task.generate({
        maximumTokens: 2048,
        messages: request.messages,
        onComplete: (response) =>
          onResponse({
            requestId: request.requestId,
            text: formatSajuAnswer(response.text),
            type: 'complete',
          }),
        onError: (message) => onResponse({message, requestId: request.requestId, type: 'error'}),
        onStarted: () => onResponse({requestId: request.requestId, type: 'started'}),
        temperature: 0.2,
      })
    },
  }
}
