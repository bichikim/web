import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {createWorkerFailureHandler} from '../worker-failure'
import type {TextModelId} from '../text-generation/model'
import {createWorkerTransport} from 'src/utils/worker-transport'
import type {DialogueOutputLanguage} from './prompt'

export interface CreateDialogueClientOptions {
  readonly modelId: TextModelId
  readonly onResponse: (response: DialogueWorkerResponse) => void
}

export interface DialogueClient {
  readonly dispose: () => void
  readonly generate: (request: string, outputLanguage?: DialogueOutputLanguage) => void
  readonly prepare: () => void
}

/** Owns one dialogue Worker and translates its browser events into feature messages. */
export const createDialogueClient = (options: CreateDialogueClientOptions): DialogueClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-dialogue-writer',
    type: 'module',
  })
  const transport = createWorkerTransport<DialogueWorkerRequest, DialogueWorkerResponse>({
    onFailure: createWorkerFailureHandler({
      fallbackDetail: '대화문 모델 Worker 실행 오류',
      feature: 'dialogue-model',
      onResponse: options.onResponse,
    }),
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    generate: (request, outputLanguage) =>
      transport.send({
        modelId: options.modelId,
        outputLanguage,
        request,
        type: 'generate',
      }),
    prepare: () => transport.send({modelId: options.modelId, type: 'prepare'}),
  }
}
