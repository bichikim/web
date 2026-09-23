/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

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

const mocks = vi.hoisted(() => {
  const dispose = vi.fn()
  const send = vi.fn()
  return {
    createWorkerTransport: vi.fn((_options: CapturedTransportOptions) => ({dispose, send})),
    dispose,
    send,
  }
})

vi.mock('../../../utils/worker-transport', () => ({
  createWorkerTransport: mocks.createWorkerTransport,
}))

import {createTextModelDownloadClient} from '../text-client'

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

it('should own the text download worker and expose its transport', () => {
  const onResponse = vi.fn()
  const client = createTextModelDownloadClient({onResponse})
  const transportOptions = mocks.createWorkerTransport.mock.calls[0]![0]
  const request = {modelId: 'gemma-4-e2b', type: 'prepare'} as const

  expect(TestWorker.instances[0]?.options).toEqual({
    name: 'pomo-text-model-download',
    type: 'module',
  })
  expect(transportOptions).toMatchObject({onResponse})
  expect(transportOptions.worker).toBe(TestWorker.instances[0])
  transportOptions.onFailure({
    cause: new Error('download failed'),
    code: 'worker-error',
    detail: 'download failed',
  })
  expect(onResponse).toHaveBeenCalledWith({
    message: 'download failed',
    restartRequired: true,
    type: 'error',
  })
  transportOptions.onFailure({cause: new Error(), code: 'worker-error', detail: ''})
  expect(onResponse).toHaveBeenLastCalledWith({
    message: '모델 다운로드 Worker 실행 오류',
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
    feature: 'text-model-download',
    source: 'worker',
  })

  client.prepare(request)
  client.dispose()
  expect(mocks.send).toHaveBeenCalledWith(request)
  expect(mocks.dispose).toHaveBeenCalledOnce()
})
