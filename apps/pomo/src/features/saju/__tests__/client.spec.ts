/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {requestCloudText} from 'src/features/cloud-text/client'
import {CLOUD_TEXT_RESPONSE} from 'src/features/cloud-text/__tests__/fixtures/response'
import type {CloudTextResponse} from 'src/features/cloud-text/contracts'
import {createSajuClient} from '../client'
import {calculateSajuReading} from '../calculate-reading'

vi.mock('src/features/cloud-text/client', () => ({requestCloudText: vi.fn()}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('Worker', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

function createReading() {
  const result = calculateSajuReading({
    birth: {calendar: 'solar', date: '1995-03-16'},
    gender: 'N',
    question: '제 일은 어떨까요?',
  })
  if (result.type !== 'generate') {
    throw new Error('Expected a generated reading')
  }
  return {...result.request, modelId: 'cloud' as const, requestId: 'saju-1'}
}

it('should generate a cloud reading from calculated messages without creating a local Worker', async () => {
  const pending = Promise.withResolvers<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(pending.promise)
  const onResponse = vi.fn()
  const client = createSajuClient(onResponse, 'cloud')
  const request = createReading()
  try {
    client.generate(request)
    expect(Worker).not.toHaveBeenCalled()
    expect(onResponse).toHaveBeenCalledExactlyOnceWith({requestId: 'saju-1', type: 'started'})
    expect(requestCloudText).toHaveBeenCalledExactlyOnceWith(
      {maximumTokens: 768, messages: request.messages, requestId: expect.any(String)},
      expect.any(AbortSignal),
    )
    pending.resolve(CLOUD_TEXT_RESPONSE)
    await pending.promise
    expect(onResponse).toHaveBeenLastCalledWith({
      requestId: 'saju-1',
      text: CLOUD_TEXT_RESPONSE.text,
      type: 'complete',
    })
  } finally {
    client.dispose()
  }
})

it('should report cloud failures with the active reading request ID', async () => {
  const pending = Promise.withResolvers<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(pending.promise)
  const onResponse = vi.fn()
  const client = createSajuClient(onResponse, 'cloud')
  try {
    client.generate(createReading())
    pending.reject(new Error('로그인이 필요해요.'))
    await pending.promise.catch(() => undefined)
    expect(onResponse).toHaveBeenLastCalledWith({
      message: '로그인이 필요해요.',
      requestId: 'saju-1',
      type: 'error',
    })
  } finally {
    client.dispose()
  }
})

it('should abort the cloud reading and ignore a late answer when disposed', async () => {
  const pending = Promise.withResolvers<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(pending.promise)
  const onResponse = vi.fn()
  const client = createSajuClient(onResponse, 'cloud')
  client.generate(createReading())
  const signal = vi.mocked(requestCloudText).mock.calls[0]![1]
  client.dispose()
  expect(signal.aborted).toBe(true)
  pending.resolve(CLOUD_TEXT_RESPONSE)
  await pending.promise
  expect(onResponse).toHaveBeenCalledExactlyOnceWith({requestId: 'saju-1', type: 'started'})
})

it.each([undefined, 'gemma-4-e2b'] as const)(
  'should preserve local Worker requests and cleanup for model %s',
  (modelId) => {
    const worker = Object.assign(new EventTarget(), {postMessage: vi.fn(), terminate: vi.fn()})
    vi.stubGlobal(
      'Worker',
      vi.fn(function createWorker() {
        return worker
      }),
    )
    const onResponse = vi.fn()
    const client = createSajuClient(onResponse, modelId)
    const request = {...createReading(), modelId: 'gemma-4-e2b' as const}
    try {
      client.generate(request)
      expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(request)
      expect(requestCloudText).not.toHaveBeenCalled()
      const response = {requestId: request.requestId, text: '기기 풀이', type: 'complete'}
      worker.dispatchEvent(new MessageEvent('message', {data: response}))
      expect(onResponse).toHaveBeenCalledExactlyOnceWith(response)
    } finally {
      client.dispose()
    }
    expect(worker.terminate).toHaveBeenCalledOnce()
  },
)
