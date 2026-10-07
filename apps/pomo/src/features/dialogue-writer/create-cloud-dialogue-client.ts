import {createCloudTextTask} from '../cloud-text/create-cloud-text-task'
import {createDirectAnswerMessages} from './prompt'
import type {CreateDialogueClientOptions, DialogueClient} from './client'

const MAXIMUM_NEW_TOKENS = 1024

export const createCloudDialogueClient = (options: CreateDialogueClientOptions): DialogueClient => {
  const task = createCloudTextTask()
  return {
    dispose: task.dispose,
    generate: (request, outputLanguage = 'ko') => {
      task.generate({
        maximumTokens: MAXIMUM_NEW_TOKENS,
        messages: createDirectAnswerMessages({outputLanguage, request}),
        onComplete: (response) => options.onResponse({text: response.text, type: 'complete'}),
        onError: (message) => options.onResponse({message, restartRequired: false, type: 'error'}),
        onStarted: () => options.onResponse({type: 'started'}),
      })
    },
    prepare: () => options.onResponse({type: 'ready'}),
  }
}
