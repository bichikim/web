/** @vitest-environment node */
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {SqliteRunnerJobStore} from '../store'
import {createRunnerService} from '../service'
import type {RunnerArtifactStore, RunnerExecutionResult, RunnerExecutor} from '../types'
import type {AiRunnerJobRequest} from '../../ai/runner-contract'

const firstJobId = '019d0000-0000-7000-8000-000000000001'
const secondJobId = '019d0000-0000-7000-8000-000000000002'

const createRequest = (
  jobId: string,
  capability: AiRunnerJobRequest['capability'] = 'text',
): AiRunnerJobRequest => ({
  capability,
  input: {messages: [{content: jobId, role: 'user'}]},
  jobId,
  modelId: capability === 'text' ? 'gemma-4-e2b' : 'supertonic-int8',
  protocolVersion: 1,
  ...(capability === 'text'
    ? {}
    : {
        artifact: {
          intermediateObjectKeyPrefix: `ai/intermediate/${jobId}`,
          objectKeyPrefix: `ai/jobs/${jobId}/temporary`,
        },
      }),
})

const createArtifactStore = (): RunnerArtifactStore => {
  const objects = new Map<string, Uint8Array>()
  return {
    delete: async (objectKey) => {
      objects.delete(objectKey)
    },
    put: async ({bytes, contentType, durationMs, jobId, objectKeyPrefix}) => {
      const objectKey = `${objectKeyPrefix}/result.wav`
      objects.set(objectKey, bytes)
      return {contentType, durationMs, objectKey, sizeBytes: bytes.byteLength}
    },
  }
}

const createStore = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-ai-runner-service-'))
  return {directory, store: new SqliteRunnerJobStore(join(directory, 'runner.sqlite'))}
}

describe('runner service', () => {
  let directory: string
  let store: SqliteRunnerJobStore

  beforeEach(async () => {
    const created = await createStore()
    directory = created.directory
    store = created.store
  })

  afterEach(async () => {
    store.close()
    await rm(directory, {force: true, recursive: true})
  })

  it('should execute queued jobs with one global inference slot', async () => {
    let active = 0
    let maximumActive = 0
    let releaseFirst: () => void = () => undefined
    const executor: RunnerExecutor = {
      execute: async (job): Promise<RunnerExecutionResult> => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        if (job.jobId === firstJobId) {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve
          })
        }
        active -= 1
        return {kind: 'text', text: job.jobId}
      },
    }
    const service = createRunnerService({
      artifactStore: createArtifactStore(),
      executor,
      jobStore: store,
      timeoutMs: 1_000,
    })

    service.submit(createRequest(firstJobId))
    service.submit(createRequest(secondJobId))
    await Promise.resolve()
    await Promise.resolve()

    expect(maximumActive).toBe(1)
    expect(store.get(secondJobId)?.status).toBe('queued')
    releaseFirst()
    await service.waitForIdle()

    expect(service.getStatus(secondJobId)?.status).toBe('succeeded')
  })

  it('should turn an active cancellation into a terminal cancelled state', async () => {
    const executor: RunnerExecutor = {
      execute: async (_job, context) =>
        new Promise<RunnerExecutionResult>((_resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true})
        }),
    }
    const service = createRunnerService({
      artifactStore: createArtifactStore(),
      executor,
      jobStore: store,
      timeoutMs: 1_000,
    })

    service.submit(createRequest(firstJobId))
    await Promise.resolve()
    service.cancel(firstJobId)
    await service.waitForIdle()

    expect(service.getStatus(firstJobId)).toMatchObject({status: 'cancelled'})
  })

  it('should fail a job when the execution timeout aborts the executor', async () => {
    const executor: RunnerExecutor = {
      execute: async (_job, context) =>
        new Promise<RunnerExecutionResult>((_resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(new Error('timeout')), {once: true})
        }),
    }
    const service = createRunnerService({
      artifactStore: createArtifactStore(),
      executor,
      jobStore: store,
      timeoutMs: 5,
    })

    service.submit(createRequest(firstJobId))
    await service.waitForIdle()

    expect(service.getStatus(firstJobId)).toMatchObject({
      error: {code: 'timeout'},
      status: 'failed',
    })
  })

  it('should persist media results under the job temporary prefix', async () => {
    const executor: RunnerExecutor = {
      execute: async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'audio/wav',
        durationMs: 120,
        kind: 'artifact',
      }),
    }
    const service = createRunnerService({
      artifactStore: createArtifactStore(),
      executor,
      jobStore: store,
      timeoutMs: 1_000,
    })

    service.submit(createRequest(firstJobId, 'text_to_speech'))
    await service.waitForIdle()

    expect(service.getStatus(firstJobId)).toMatchObject({
      result: {
        artifact: {
          contentType: 'audio/wav',
          objectKey: `ai/jobs/${firstJobId}/temporary/result.wav`,
          sizeBytes: 3,
        },
      },
      status: 'succeeded',
    })
  })
})

it('should preserve queued work on shutdown without starting another inference', async () => {
  const {directory, store} = await createStore()
  const execute = vi.fn(
    async (_job, context) =>
      new Promise<RunnerExecutionResult>((_resolve, reject) => {
        context.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true})
      }),
  )
  const service = createRunnerService({
    artifactStore: createArtifactStore(),
    executor: {execute},
    jobStore: store,
    timeoutMs: 100,
  })
  service.submit(createRequest(firstJobId))
  service.submit(createRequest(secondJobId))
  await service.close()
  const reopened = new SqliteRunnerJobStore(join(directory, 'runner.sqlite'))
  try {
    expect(execute).toHaveBeenCalledTimes(1)
    expect(reopened.get(secondJobId)?.status).toBe('queued')
  } finally {
    reopened.close()
    await rm(directory, {force: true, recursive: true})
  }
})

it('should delete an uploaded artifact when the deadline passes during upload', async () => {
  const {directory, store} = await createStore()
  const remove = vi.fn(async () => undefined)
  const artifactStore: RunnerArtifactStore = {
    delete: remove,
    put: async ({objectKeyPrefix}) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 30)
      })
      return {contentType: 'audio/wav', objectKey: `${objectKeyPrefix}/result.wav`, sizeBytes: 1}
    },
  }
  const service = createRunnerService({
    artifactStore,
    executor: {
      execute: async () => ({
        bytes: new Uint8Array([1]),
        contentType: 'audio/wav',
        kind: 'artifact',
      }),
    },
    jobStore: store,
    timeoutMs: 5,
  })
  try {
    service.submit(createRequest(firstJobId, 'text_to_speech'))
    await service.waitForIdle()
    expect(service.getStatus(firstJobId)).toMatchObject({
      error: {code: 'timeout'},
      status: 'failed',
    })
    expect(remove).toHaveBeenCalledWith(`ai/jobs/${firstJobId}/temporary/result.wav`)
  } finally {
    await service.close()
    await rm(directory, {force: true, recursive: true})
  }
})

it.each(['cancel', 'timeout', 'shutdown'] as const)(
  'should abort an in-flight artifact upload on %s',
  async (reason) => {
    const {directory, store} = await createStore()
    const deadline = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
    const entered = Promise.withResolvers<void>()
    const upload = Promise.withResolvers<never>()
    const put = vi.fn<RunnerArtifactStore['put']>(() => {
      entered.resolve()
      return upload.promise
    })
    const service = createRunnerService({
      artifactStore: {delete: vi.fn(), put},
      executor: {
        execute: async () => ({
          bytes: new Uint8Array([1]),
          contentType: 'audio/wav',
          kind: 'artifact',
        }),
      },
      jobStore: store,
      timeoutMs: 1000,
    })
    let closing: Promise<void> | undefined
    try {
      service.submit(createRequest(firstJobId, 'text_to_speech'))
      await entered.promise
      switch (reason) {
        case 'cancel':
          service.cancel(firstJobId)
          break
        case 'timeout':
          deadline.abort()
          break
        case 'shutdown':
          closing = service.close()
          break
      }
      expect(put.mock.calls[0]?.[0]).toMatchObject({
        signal: expect.objectContaining({aborted: true}),
      })
    } finally {
      upload.reject(new Error('upload aborted'))
      await (closing ?? service.close())
      timeout.mockRestore()
      await rm(directory, {force: true, recursive: true})
    }
  },
)

it.each([
  {code: 'inference-failed', message: 'x'.repeat(1001)},
  {code: 'x'.repeat(65), message: 'model error'},
])('should return terminal status for an oversized persisted error', async (error) => {
  const {directory, store} = await createStore()
  store.create(createRequest(firstJobId))
  store.claimNext()
  store.finishFailure(firstJobId, error, {}, Date.now())
  const service = createRunnerService({
    artifactStore: createArtifactStore(),
    executor: {execute: vi.fn()},
    jobStore: store,
    timeoutMs: 1000,
  })
  try {
    const status = service.getStatus(firstJobId)
    expect(status?.status).toBe('failed')
    expect(status?.error?.message.length).toBeLessThanOrEqual(1000)
    expect(status?.error?.code.length).toBeLessThanOrEqual(64)
  } finally {
    await service.close()
    await rm(directory, {force: true, recursive: true})
  }
})
