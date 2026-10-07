/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {requestCloudText} from 'src/features/cloud-text/client'
import type {CloudTextResponse} from 'src/features/cloud-text/contracts'
import {CLOUD_TEXT_RESPONSE} from 'src/features/cloud-text/__tests__/fixtures/response'

vi.mock('src/features/cloud-text/client', () => ({requestCloudText: vi.fn()}))

const reportClientError = vi.hoisted(() => vi.fn())

vi.mock('../../client-error-reporter/reporter', () => ({reportClientError}))

interface CapturedTransportOptions {
  readonly onFailure: (failure: {
    readonly cause: unknown
    readonly code: 'message-error' | 'worker-error'
    readonly detail: string
  }) => void
  readonly onResponse: (response: unknown) => void
  readonly worker: Worker
}

const {createWorkerTransport, dispose, send} = vi.hoisted(() => {
  const dispose = vi.fn()
  const send = vi.fn()
  return {
    createWorkerTransport: vi.fn((_options: CapturedTransportOptions) => ({dispose, send})),
    dispose,
    send,
  }
})

vi.mock('../../../utils/worker-transport', () => ({createWorkerTransport}))

import {createChatClient} from '../client'

class TestWorker {
  static instances: TestWorker[] = []

  constructor(
    readonly url: URL,
    readonly options: WorkerOptions,
  ) {
    TestWorker.instances.push(this)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  TestWorker.instances.length = 0
  vi.stubGlobal('Worker', TestWorker)
})

it('should own the chat worker transport and forward all client commands', () => {
  const onResponse = vi.fn()
  const client = createChatClient({modelId: 'gemma-4-e2b', onResponse})
  const transportOptions = createWorkerTransport.mock.calls[0]![0]

  expect(TestWorker.instances[0]?.options).toEqual({name: 'pomo-chat', type: 'module'})
  expect(transportOptions).toMatchObject({onResponse})
  expect(transportOptions.worker).toBe(TestWorker.instances[0])
  transportOptions.onFailure({
    cause: new Error('worker failed'),
    code: 'worker-error',
    detail: 'worker failed',
  })
  expect(onResponse).toHaveBeenCalledWith({
    message: 'worker failed',
    restartRequired: true,
    type: 'error',
  })
  transportOptions.onFailure({cause: new Error(), code: 'worker-error', detail: ''})
  expect(onResponse).toHaveBeenLastCalledWith({
    message: '채팅 모델 Worker 실행 오류',
    restartRequired: true,
    type: 'error',
  })
  transportOptions.onFailure({cause: new Error(), code: 'message-error', detail: ''})
  expect(onResponse).toHaveBeenLastCalledWith({
    message: 'Worker 응답을 읽지 못했습니다.',
    restartRequired: true,
    type: 'error',
  })
  expect(reportClientError).toHaveBeenCalledWith(expect.any(Error), {
    feature: 'chat-model',
    source: 'worker',
  })

  const context = {messages: [], summary: ''}
  client.generate(context, 'reply-default')
  client.generate(context, 'reply-raw', {refineAnswer: false})
  client.prepare()
  client.dispose()

  expect(send).toHaveBeenNthCalledWith(1, {
    context,
    modelId: 'gemma-4-e2b',
    refineAnswer: true,
    replyId: 'reply-default',
    type: 'generate',
  })
  expect(send).toHaveBeenNthCalledWith(2, {
    context,
    modelId: 'gemma-4-e2b',
    refineAnswer: false,
    replyId: 'reply-raw',
    type: 'generate',
  })
  expect(send).toHaveBeenNthCalledWith(3, {modelId: 'gemma-4-e2b', type: 'prepare'})
  expect(dispose).toHaveBeenCalledOnce()
})

it('should preserve chat history and produce one assistant reply per cloud action', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(deferred.promise)
  const onResponse = vi.fn()
  const client = createChatClient({modelId: 'cloud', onResponse})
  const context = {
    messages: [{content: '집중을 도와줘', id: 'user-1', role: 'user'}] as const,
    summary: '',
  }
  client.generate(context, 'reply-1')
  deferred.resolve(CLOUD_TEXT_RESPONSE)
  await deferred.promise
  expect(requestCloudText).toHaveBeenCalledOnce()
  expect(TestWorker.instances).toHaveLength(0)
  expect(onResponse).toHaveBeenLastCalledWith(
    expect.objectContaining({
      context: {
        ...context,
        messages: [
          ...context.messages,
          {content: CLOUD_TEXT_RESPONSE.text, id: 'reply-1', role: 'assistant'},
        ],
      },
      type: 'complete',
    }),
  )
  client.dispose()
})
