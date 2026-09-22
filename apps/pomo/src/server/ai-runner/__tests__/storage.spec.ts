/** @vitest-environment node */
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createRunnerArtifactStore} from '../storage'

describe('runner artifact storage', () => {
  let directory: string

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pomo-ai-runner-artifacts-'))
  })

  afterEach(async () => {
    await rm(directory, {force: true, recursive: true})
  })

  it('should atomically write media below the current job temporary prefix', async () => {
    const store = createRunnerArtifactStore({POMO_AI_RUNNER_STORAGE_PATH: directory})
    const result = await store.put({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'audio/wav',
      jobId: '019d0000-0000-7000-8000-000000000001',
      objectKeyPrefix: 'ai/jobs/019d0000-0000-7000-8000-000000000001/temporary',
    })

    await expect(readFile(join(directory, result.objectKey))).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    )
    expect(result.objectKey).toContain('/temporary/result.wav')
  })

  it('should reject an archive or another job prefix', async () => {
    const store = createRunnerArtifactStore({POMO_AI_RUNNER_STORAGE_PATH: directory})

    await expect(
      store.put({
        bytes: new Uint8Array([1]),
        contentType: 'image/png',
        jobId: '019d0000-0000-7000-8000-000000000001',
        objectKeyPrefix: 'ai/jobs/019d0000-0000-7000-8000-000000000002/temporary',
      }),
    ).rejects.toMatchObject({code: 'configuration-error'})
  })
})

it.each(['upload', 'cleanup'] as const)(
  'should bound a pending R2 %s request',
  async (operation) => {
    const entered = Promise.withResolvers<Request>()
    const pending = Promise.withResolvers<Response>()
    const fetcher = vi.fn((request: Request) => {
      entered.resolve(request)
      request.signal.addEventListener('abort', () => pending.reject(request.signal.reason), {
        once: true,
      })
      return pending.promise
    })
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    const store = createRunnerArtifactStore({
      CLOUDFLARE_R2_ACCOUNT_ID: 'test-account',
      POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID: 'test-key',
      POMO_AI_ARTIFACT_R2_BUCKET: 'test-bucket',
      POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY: 'test-secret',
    })
    const input = {
      bytes: new Uint8Array([1]),
      contentType: 'audio/wav',
      jobId: '019d0000-0000-7000-8000-000000000001',
      objectKeyPrefix: 'ai/jobs/019d0000-0000-7000-8000-000000000001/temporary',
      signal: controller.signal,
    }
    const upload =
      operation === 'upload'
        ? store.put(input)
        : store.delete(`${input.objectKeyPrefix}/result.wav`)
    const rejection = expect(upload).rejects.toThrow()
    try {
      const request = await entered.promise
      controller.abort()
      expect(request.signal.aborted).toBe(true)
    } finally {
      pending.reject(new Error('test cleanup'))
      await rejection
      timeout.mockRestore()
      vi.unstubAllGlobals()
    }
  },
)
