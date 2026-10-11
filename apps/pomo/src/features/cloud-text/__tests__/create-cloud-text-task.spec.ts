import {beforeEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {requestCloudText} from '../client'
import {createCloudTextTask} from '../create-cloud-text-task'
import type {CloudTextResponse} from '../contracts'

vi.mock('../client', () => ({requestCloudText: vi.fn()}))
const response = {
  modelId: 'actual-fallback-model',
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

it.each([
  {cause: new Error('detail'), expected: 'detail', label: 'Error'},
  {cause: new Error(''), expected: '', label: 'empty Error message'},
  {cause: new Error(' '), expected: ' ', label: 'whitespace Error message'},
  {cause: new TypeError('type detail'), expected: 'type detail', label: 'Error subclass'},
  {cause: null, expected: '클라우드 텍스트 생성에 실패했어요.', label: 'null'},
  {cause: 'detail', expected: '클라우드 텍스트 생성에 실패했어요.', label: 'string'},
  {cause: {message: 'detail'}, expected: '클라우드 텍스트 생성에 실패했어요.', label: 'object'},
])('should report the unchanged message for $label rejection', async ({cause, expected}) => {
  vi.mocked(requestCloudText).mockRejectedValue(cause)
  const observer = options()

  await createCloudTextTask().generate(observer)

  expect(observer.onStarted).toHaveBeenCalledOnce()
  expect(observer.onComplete).not.toHaveBeenCalled()
  expect(observer.onError).toHaveBeenCalledExactlyOnceWith(expected)
})

it('should read an Error message once and preserve its runtime value', async () => {
  const cause = new Error()
  const readMessage = vi.fn(() => 42)
  Object.defineProperty(cause, 'message', {get: readMessage})
  vi.mocked(requestCloudText).mockRejectedValue(cause)
  const observer = options()

  await createCloudTextTask().generate(observer)

  expect(readMessage).toHaveBeenCalledOnce()
  expect(observer.onError).toHaveBeenCalledExactlyOnceWith(42)
})

it('should use the fallback without reading a non-Error message getter', async () => {
  const readMessage = vi.fn(() => {
    throw new Error('unexpected message access')
  })
  const cause = Object.defineProperty({}, 'message', {get: readMessage})
  vi.mocked(requestCloudText).mockRejectedValue(cause)
  const observer = options()

  await createCloudTextTask().generate(observer)

  expect(readMessage).not.toHaveBeenCalled()
  expect(observer.onError).toHaveBeenCalledExactlyOnceWith('클라우드 텍스트 생성에 실패했어요.')
})

it('should propagate a thrown message getter and release the active request', async () => {
  const failure = new Error('message getter failed')
  const cause = new Error()
  Object.defineProperty(cause, 'message', {
    get() {
      throw failure
    },
  })
  vi.mocked(requestCloudText).mockRejectedValueOnce(cause).mockResolvedValue(response)
  const task = createCloudTextTask()
  const observer = options()
  const rejected = await task.generate(observer).catch((error: unknown) => error)

  expect(rejected).toBe(failure)
  expect(observer.onError).not.toHaveBeenCalled()
  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledTimes(2)
  expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith(response)
})

it('should suppress a late rejection after disposal without reading its message', async () => {
  const deferred = createDeferred<CloudTextResponse>()
  vi.mocked(requestCloudText).mockReturnValue(deferred.promise)
  const readMessage = vi.fn(() => 'late detail')
  const cause = Object.defineProperty(new Error(), 'message', {get: readMessage})
  const observer = options()
  const task = createCloudTextTask()
  const pending = task.generate(observer)

  task.dispose()
  deferred.reject(cause)
  await pending

  expect(readMessage).not.toHaveBeenCalled()
  expect(observer.onError).not.toHaveBeenCalled()
  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledOnce()
})

it('should ignore reentry from the error callback and accept a later request', async () => {
  vi.mocked(requestCloudText).mockRejectedValueOnce(new Error('detail')).mockResolvedValue(response)
  const observer = options()
  const task = createCloudTextTask()
  observer.onError.mockImplementation(() => {
    void task.generate(observer)
  })

  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledOnce()
  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledTimes(2)
  expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith(response)
})

it('should translate a completion callback failure through the existing error callback', async () => {
  vi.mocked(requestCloudText).mockResolvedValue(response)
  const observer = options()
  observer.onComplete.mockImplementation(() => {
    throw new Error('completion failed')
  })

  await createCloudTextTask().generate(observer)

  expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith(response)
  expect(observer.onError).toHaveBeenCalledExactlyOnceWith('completion failed')
})

it('should propagate an error callback failure and allow another request', async () => {
  const failure = new Error('observer failed')
  vi.mocked(requestCloudText).mockRejectedValueOnce(null).mockResolvedValue(response)
  const task = createCloudTextTask()
  const observer = options()
  observer.onError.mockImplementation(() => {
    throw failure
  })
  const rejected = await task.generate(observer).catch((error: unknown) => error)

  expect(rejected).toBe(failure)
  await task.generate(observer)
  expect(requestCloudText).toHaveBeenCalledTimes(2)
  expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith(response)
})
