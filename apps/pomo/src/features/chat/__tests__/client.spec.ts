import {beforeEach, expect, it, vi} from 'vitest'

interface CapturedTransportOptions {
  readonly createErrorResponse: (event: {readonly message: string}) => unknown
  readonly feature: string
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

vi.mock('../../text-generation/worker-transport', () => ({createWorkerTransport}))

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
  expect(transportOptions).toMatchObject({feature: 'chat-model', onResponse})
  expect(transportOptions.worker).toBe(TestWorker.instances[0])
  expect(transportOptions.createErrorResponse({message: 'worker failed'})).toEqual({
    message: 'worker failed',
    restartRequired: true,
    type: 'error',
  })
  expect(transportOptions.createErrorResponse({message: ''})).toEqual({
    message: '채팅 모델 Worker 실행 오류',
    restartRequired: true,
    type: 'error',
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
