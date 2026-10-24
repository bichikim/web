/** @vitest-environment node */
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it, vi} from 'vitest'
vi.mock('src/env', () => ({env: {}}))
import {createAiRunnerClient} from '../runner-client'
import {createAiRunnerJobRequest} from '../runner-contract'
import {parseAiJobResult} from '../contracts'
import {aiJobResultSchema} from '../../../features/ai-job/contracts'
import {createRunnerHttpServer} from '../../ai-runner/http'
import {createRunnerService} from '../../ai-runner/service'
import {SqliteRunnerJobStore} from '../../ai-runner/store'
import {createRunnerArtifactStore} from '../../ai-runner/storage'
import type {RunnerExecutionResult} from '../../ai-runner/types'

it('should bridge Pomo media requests through HTTP and durable runner storage to the UI result contract', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-http-integration-'))
  const jobId = '019d0000-0000-7000-8000-000000000005'
  const execute = vi.fn(
    async (): Promise<RunnerExecutionResult> => ({
      bytes: new Uint8Array([82, 73, 70, 70]),
      contentType: 'audio/wav',
      durationMs: 100,
      kind: 'artifact',
    }),
  )
  const store = new SqliteRunnerJobStore(join(directory, 'jobs.sqlite'))
  const service = createRunnerService({
    artifactStore: createRunnerArtifactStore({POMO_AI_RUNNER_STORAGE_PATH: directory}),
    executor: {execute},
    jobStore: store,
    timeoutMs: 1000,
  })
  const server = createRunnerHttpServer({service, token: 'integration-only'})
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Runner did not bind')
  }
  const client = createAiRunnerClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    timeoutMs: 1000,
    token: 'integration-only',
  })
  try {
    const request = createAiRunnerJobRequest({
      capability: 'text-to-speech',
      input: {text: '테스트'},
      jobId,
      modelId: 'supertonic-int8',
    })
    await expect(client.submit(request)).resolves.toEqual({jobId})
    await service.waitForIdle()
    await client.submit(request)
    await service.waitForIdle()
    expect(execute).toHaveBeenCalledOnce()
    const result = await client.getStatus(jobId)
    expect(result.status).toBe('succeeded')
    const parsed = parseAiJobResult('text-to-speech', result.result ?? {})
    expect(aiJobResultSchema.parse(parsed)).toMatchObject({
      artifact: {
        contentType: 'audio/wav',
        durationMs: 100,
        objectKey: `ai/jobs/${jobId}/temporary/result.wav`,
      },
    })
    expect(await readFile(join(directory, `ai/jobs/${jobId}/temporary/result.wav`))).toEqual(
      Buffer.from([82, 73, 70, 70]),
    )
    await expect(client.submit({...request, input: {text: 'different'}})).rejects.toMatchObject({
      retryable: false,
      status: 409,
    })
  } finally {
    await service.close()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
    await rm(directory, {force: true, recursive: true})
  }
})

it('should cancel an active HTTP job without losing its durable status or resubmitting inference', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-http-cancel-'))
  const jobId = '019d0000-0000-7000-8000-000000000006'
  const started = Promise.withResolvers<void>()
  const execute = vi.fn(async (_job, context): Promise<RunnerExecutionResult> => {
    started.resolve()
    await new Promise<void>((_resolve, reject) => {
      context.signal.addEventListener('abort', () => reject(new Error('cancelled')), {once: true})
    })
    return {kind: 'text', text: 'unreachable'}
  })
  const database = join(directory, 'jobs.sqlite')
  const service = createRunnerService({
    artifactStore: createRunnerArtifactStore({POMO_AI_RUNNER_STORAGE_PATH: directory}),
    executor: {execute},
    jobStore: new SqliteRunnerJobStore(database),
    timeoutMs: 1000,
  })
  const server = createRunnerHttpServer({service, token: 'integration-only'})
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Runner did not bind')
  }
  const client = createAiRunnerClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    timeoutMs: 1000,
    token: 'integration-only',
  })
  try {
    const request = createAiRunnerJobRequest({
      capability: 'text',
      input: {messages: [{content: '안녕', role: 'user'}]},
      jobId,
      modelId: 'gemma-4-e2b',
    })
    await client.submit(request)
    await started.promise
    await client.cancel(jobId)
    await service.waitForIdle()
    expect(await client.getStatus(jobId)).toMatchObject({status: 'cancelled'})
    await client.submit(request)
    await service.waitForIdle()
    expect(execute).toHaveBeenCalledOnce()
  } finally {
    await service.close()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }
  const reopened = new SqliteRunnerJobStore(database)
  try {
    expect(reopened.get(jobId)?.status).toBe('cancelled')
  } finally {
    reopened.close()
    await rm(directory, {force: true, recursive: true})
  }
})
