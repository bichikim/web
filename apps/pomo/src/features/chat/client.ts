import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from './messages'
import type {TextModelId} from '../text-generation/model'
import {createWorkerTransport} from '../text-generation/worker-transport'

export interface CreateChatClientOptions {
  readonly modelId: TextModelId
  readonly onResponse: (response: ChatWorkerResponse) => void
}

export interface ChatClient {
  readonly dispose: () => void
  readonly generate: (context: ChatContext, replyId: string) => void
  readonly prepare: () => void
}

/** Owns the browser model Worker for one chat session. */
export const createChatClient = (options: CreateChatClientOptions): ChatClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-chat',
    type: 'module',
  })
  const transport = createWorkerTransport<ChatWorkerRequest, ChatWorkerResponse>({
    createErrorResponse: (event) => ({
      message: event.message || '채팅 모델 Worker 실행 오류',
      restartRequired: true,
      type: 'error',
    }),
    onResponse: options.onResponse,
    worker,
  })

  return {
    dispose: transport.dispose,
    generate: (context, replyId) =>
      transport.send({context, modelId: options.modelId, replyId, type: 'generate'}),
    prepare: () => transport.send({modelId: options.modelId, type: 'prepare'}),
  }
}
