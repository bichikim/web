/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {beforeEach, expect, it, vi} from 'vitest'

const state = vi.hoisted(() => ({
  workers: [] as Array<EventEmitter & {terminate: ReturnType<typeof vi.fn>}>,
}))
vi.mock('node:worker_threads', async () => {
  const {EventEmitter: Emitter} = await import('node:events')
  return {
    Worker: class extends Emitter {
      terminate = vi.fn(async () => 0)
      constructor() {
        super()
        state.workers.push(this)
      }
    },
  }
})
import {createWorkerExecutor} from '../worker-executor'
import type {RunnerJobRecord} from '../types'
const job: RunnerJobRecord = {
  cancelRequested: false,
  createdAt: 0,
  error: null,
  finishedAt: null,
  jobId: '019d0000-0000-7000-8000-000000000001',
  metrics: null,
  progress: 0,
  recoveryCount: 0,
  request: {
    capability: 'text',
    input: {},
    jobId: '019d0000-0000-7000-8000-000000000001',
    modelId: 'gemma-4-e2b',
    protocolVersion: 1,
  },
  result: null,
  startedAt: 0,
  status: 'running',
  updatedAt: 0,
}
beforeEach(() => {
  state.workers.length = 0
})
it('should wait for worker termination before releasing a cancelled execution', async () => {
  const controller = new AbortController()
  const pending = createWorkerExecutor().execute(job, {
    onProgress: vi.fn(),
    signal: controller.signal,
  })
  const worker = state.workers[0]!
  const termination = Promise.withResolvers<number>()
  worker.terminate.mockReturnValue(termination.promise)
  let settled = false
  const assertion = expect(pending).rejects.toThrow('cancelled')
  pending.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )
  controller.abort()
  await Promise.resolve()
  expect(worker.terminate).toHaveBeenCalledOnce()
  expect(settled).toBe(false)
  termination.resolve(1)
  await assertion
})
it('should relay progress and the result and terminate the worker', async () => {
  const progress = vi.fn()
  const pending = createWorkerExecutor().execute(job, {
    onProgress: progress,
    signal: new AbortController().signal,
  })
  const worker = state.workers[0]!
  worker.emit('message', {progress: 42, type: 'progress'})
  worker.emit('message', {result: {kind: 'text', text: 'hello'}, type: 'complete'})
  await expect(pending).resolves.toEqual({kind: 'text', text: 'hello'})
  expect(progress).toHaveBeenCalledWith(42)
  expect(worker.terminate).toHaveBeenCalledOnce()
})
it('should reject an exit without a result even with a zero exit code', async () => {
  const pending = createWorkerExecutor().execute(job, {
    onProgress: vi.fn(),
    signal: new AbortController().signal,
  })
  state.workers[0]!.emit('exit', 0)
  await expect(pending).rejects.toThrow('without a result')
})
