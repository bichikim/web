import {beforeEach, expect, it, vi} from 'vitest'

interface CapturedTransportOptions {
  readonly createErrorResponse: (event: {readonly message: string}) => unknown
  readonly feature: string
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

vi.mock('../../text-generation/worker-transport', () => ({
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
  expect(transportOptions).toMatchObject({feature: 'text-model-download', onResponse})
  expect(transportOptions.worker).toBe(TestWorker.instances[0])
  expect(transportOptions.createErrorResponse({message: 'download failed'})).toEqual({
    message: 'download failed',
    restartRequired: true,
    type: 'error',
  })
  expect(transportOptions.createErrorResponse({message: ''})).toEqual({
    message: '모델 다운로드 Worker 실행 오류',
    restartRequired: true,
    type: 'error',
  })

  client.prepare(request)
  client.dispose()
  expect(mocks.send).toHaveBeenCalledWith(request)
  expect(mocks.dispose).toHaveBeenCalledOnce()
})
