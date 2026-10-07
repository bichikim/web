import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {requestCloudText} from '../client'
import {createCloudTextTask} from '../create-cloud-text-task'
import type {CloudTextResponse} from '../contracts'

vi.mock('../client', () => ({requestCloudText: vi.fn()}))
const response = {
  text: '완료',
  tokenCount: 200,
  usage: {day: '2026-10-07', limit: 3, remaining: 2, resetsAt: '2026-10-07T15:00:00.000Z', used: 1},
}
const options = () => ({
  maximumTokens: 2560,
  messages: [{content: '질문', role: 'user'}] as const,
  onComplete: vi.fn(),
  onError: vi.fn(),
  onStarted: vi.fn(),
})
beforeEach(() => {
  vi.resetAllMocks()
})

it('should issue one request while an action is active and complete with its server result', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(deferred.promise)
  const task = createCloudTextTask()
  const observer = options()
  const pending = task.generate(observer)
  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledOnce()
  deferred.resolve(response)
  await pending
  expect(observer.onComplete).toHaveBeenCalledWith(response)
})

it('should abort on disposal and suppress late responses', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(deferred.promise)
  const task = createCloudTextTask()
  const observer = options()
  const pending = task.generate(observer)
  const signal = vi.mocked(requestCloudText).mock.calls[0]![1]
  task.dispose()
  expect(signal.aborted).toBe(true)
  deferred.resolve(response)
  await pending
  expect(observer.onComplete).not.toHaveBeenCalled()
  expect(observer.onError).not.toHaveBeenCalled()
})
