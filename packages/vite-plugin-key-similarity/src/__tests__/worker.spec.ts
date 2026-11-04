import {EventEmitter} from 'node:events'
import {afterEach, expect, it, vi} from 'vitest'
import type {AnalysisJob} from '../queue'

const mocks = vi.hoisted(() => ({
  initializeForVite: vi.fn(),
  port: undefined as (EventEmitter & {postMessage: ReturnType<typeof vi.fn>}) | undefined,
  updateExtraction: vi.fn(),
}))
vi.mock('node:worker_threads', () => ({
  default: {
    get parentPort() {
      return mocks.port
    },
    workerData: {},
  },
  get parentPort() {
    return mocks.port
  },
  workerData: {},
}))
vi.mock('../core', () => ({
  KeySimilarityCore: class {
    initializeForVite = mocks.initializeForVite
    updateExtraction = mocks.updateExtraction
  },
}))

afterEach(() => {
  vi.resetAllMocks()
  vi.resetModules()
})

it('sends revision metadata on analysis failure and continues serial processing', async () => {
  const started = Promise.withResolvers<void>()
  const analysis = Promise.withResolvers<never>()
  const replies: unknown[] = []
  const completed = Promise.withResolvers<void>()
  mocks.port = Object.assign(new EventEmitter(), {
    postMessage: vi.fn((message: unknown) => {
      replies.push(message)
      if (replies.length === 2) {
        completed.resolve()
      }
    }),
  })
  mocks.initializeForVite.mockResolvedValue(undefined)
  mocks.updateExtraction
    .mockImplementationOnce(() => {
      started.resolve()
      return analysis.promise
    })
    .mockResolvedValueOnce([])
  await import('../worker')
  const first: AnalysisJob = {
    extraction: {dynamicCalls: [], entries: []},
    filePath: '/module.ts',
    identifier: 10,
    revision: 1,
  }
  const second: AnalysisJob = {...first, identifier: 11, revision: 2}
  mocks.port.emit('message', first)
  await started.promise
  mocks.port.emit('message', second)
  expect(mocks.updateExtraction).toHaveBeenCalledOnce()
  expect(replies).toEqual([])
  analysis.reject(new Error('first analysis failed'))
  await completed.promise
  expect(replies).toEqual([
    {
      error: expect.stringContaining('first analysis failed'),
      filePath: first.filePath,
      identifier: 10,
      revision: 1,
    },
    {diagnostics: [], filePath: second.filePath, identifier: 11, revision: 2},
  ])
})
