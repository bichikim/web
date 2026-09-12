import type {DialogueWorkerRequest, DialogueWorkerResponse} from './messages'
import {reportClientError} from '../client-error-reporter/reporter'
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
    onFailure: (failure) => {
      reportClientError(failure.cause, {feature: 'dialogue-model', source: 'worker'})
      options.onResponse({
        message:
          failure.code === 'message-error'
            ? 'Worker 응답을 읽지 못했습니다.'
            : failure.detail || '대화문 모델 Worker 실행 오류',
        restartRequired: true,
        type: 'error',
      })
    },
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
