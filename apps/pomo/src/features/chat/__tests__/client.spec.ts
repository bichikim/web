/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/__tests__/create-deferred'
import {requestCloudText} from 'src/features/cloud-text/client'
import {cloudTextRequestSchema, type CloudTextResponse} from 'src/features/cloud-text/contracts'
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

it('should send the JSON schema across the actual worker message contract', () => {
  const client = createChatClient({modelId: 'gemma-4-e2b', onResponse: vi.fn()})
  const outputSchema = {properties: {value: {type: 'number'}}, type: 'object'}
  client.generate({messages: [], summary: ''}, 'structured', {outputSchema})
  expect(send).toHaveBeenCalledWith(expect.objectContaining({outputSchema, replyId: 'structured'}))
  client.dispose()
})

it('should reject unsupported cloud structured output instead of silently generating prose', () => {
  const onResponse = vi.fn()
  const client = createChatClient({modelId: 'cloud', onResponse})
  client.generate({messages: [], summary: ''}, 'structured', {outputSchema: {type: 'object'}})
  expect(requestCloudText).not.toHaveBeenCalled()
  expect(onResponse).toHaveBeenCalledWith(
    expect.objectContaining({restartRequired: false, type: 'error'}),
  )
  client.dispose()
})

const createLongContext = (length: number, messageLength = 0) => ({
  messages: Array.from({length}, (_, index) => ({
    content: `메시지 ${index}${'가'.repeat(messageLength)}`,
    id: String(index),
    role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
  })),
  summary: '기존에 기억한 사용자 선호',
})

it.each([
  {length: 65, messageLength: 0, name: 'message count'},
  {length: 13, messageLength: 3_000, name: 'input size'},
])(
  'should compact old turns and answer with one cloud request near the $name limit',
  async ({length, messageLength}) => {
    const context = createLongContext(length, messageLength)
    const reply = {content: '최종 답변', id: 'reply', role: 'assistant'}
    const deferred = createDeferred<CloudTextResponse>()
    vi.mocked(requestCloudText).mockReturnValueOnce(deferred.promise)
    const onResponse = vi.fn()
    const client = createChatClient({modelId: 'cloud', onResponse})
    client.generate(context, reply.id, {supplementaryContext: '현재 일정'})
    const request = vi.mocked(requestCloudText).mock.calls[0]?.[0]
    expect(cloudTextRequestSchema.safeParse(request).success).toBe(true)
    expect(request?.messages.slice(-3)).toEqual(
      context.messages.slice(-3).map(({content, role}) => ({content, role})),
    )
    expect(request?.messages[0]?.content).toContain('현재 일정')
    expect(request?.messages[0]?.content).toContain(context.summary)
    expect(
      request?.messages
        .slice(1, -3)
        .map(({content}) => content)
        .join(''),
    ).toContain('메시지 0')

    deferred.resolve({
      ...CLOUD_TEXT_RESPONSE,
      text: JSON.stringify({answer: reply.content, summary: '갱신된 요약'}),
    })
    await deferred.promise
    expect(requestCloudText).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenLastCalledWith({
      context: {messages: [...context.messages.slice(-3), reply], summary: '갱신된 요약'},
      contextTokens: CLOUD_TEXT_RESPONSE.tokenCount,
      message: reply,
      type: 'complete',
      wasCompacted: true,
    })
    client.dispose()
  },
)

it('should keep the existing context if a compacting response is malformed', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValueOnce(deferred.promise)
  const onResponse = vi.fn()
  const client = createChatClient({modelId: 'cloud', onResponse})
  client.generate(createLongContext(65), 'reply')
  deferred.resolve({...CLOUD_TEXT_RESPONSE, text: '{"summary":"요약만 있는 응답"}'})
  await deferred.promise

  expect(requestCloudText).toHaveBeenCalledOnce()
  expect(onResponse).toHaveBeenLastCalledWith(
    expect.objectContaining({restartRequired: false, type: 'error'}),
  )
  expect(onResponse).not.toHaveBeenCalledWith(expect.objectContaining({type: 'complete'}))
  client.dispose()
})

it('should send every character of a recent message longer than a wire entry', () => {
  const content = `${'가'.repeat(11_999)}🙂나`
  const context = {messages: [{content, id: 'long', role: 'user'}] as const, summary: ''}
  vi.mocked(requestCloudText).mockReturnValueOnce(createDeferred<CloudTextResponse>().promise)
  const client = createChatClient({modelId: 'cloud', onResponse: vi.fn()})
  client.generate(context, 'reply')

  const request = vi.mocked(requestCloudText).mock.calls[0]?.[0]
  expect(cloudTextRequestSchema.safeParse(request).success).toBe(true)
  expect(request?.messages.slice(1)).toEqual([
    {content: '가'.repeat(11_999), role: 'user'},
    {content: '🙂나', role: 'user'},
  ])
  client.dispose()
})

it('should send a bounded older excerpt with unmodified recent turns for oversized history', () => {
  const context = createLongContext(65, 1_200)
  vi.mocked(requestCloudText).mockReturnValueOnce(createDeferred<CloudTextResponse>().promise)
  const client = createChatClient({modelId: 'cloud', onResponse: vi.fn()})
  client.generate(context, 'reply')

  const request = vi.mocked(requestCloudText).mock.calls[0]?.[0]
  expect(cloudTextRequestSchema.safeParse(request).success).toBe(true)
  expect(request?.messages[1]?.content).toContain('앞부분이 길이 한도를 넘어 생략된')
  expect(request?.messages.slice(-3)).toEqual(
    context.messages.slice(-3).map(({content, role}) => ({content, role})),
  )
  client.dispose()
})
