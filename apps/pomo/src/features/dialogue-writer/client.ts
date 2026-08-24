import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import type {TextModelId} from '../text-generation/model'
import {createWorkerTransport} from '../text-generation/worker-transport'

export interface CreateDialogueClientOptions {
  readonly modelId: TextModelId
  readonly onResponse: (response: DialogueWorkerResponse) => void
}

export interface DialogueClient {
  readonly dispose: () => void
  readonly generate: (request: string) => void
  readonly prepare: () => void
}

/** Owns one dialogue Worker and translates its browser events into feature messages. */
export const createDialogueClient = (options: CreateDialogueClientOptions): DialogueClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-dialogue-writer',
    type: 'module',
  })
  const transport = createWorkerTransport<DialogueWorkerRequest, DialogueWorkerResponse>({
    createErrorResponse: (event) => ({
      message: event.message || '대화문 모델 Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    }),
    feature: 'dialogue-model',
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    generate: (request) => transport.send({modelId: options.modelId, request, type: 'generate'}),
    prepare: () => transport.send({modelId: options.modelId, type: 'prepare'}),
  }
}
