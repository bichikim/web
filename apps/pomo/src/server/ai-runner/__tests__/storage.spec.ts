/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {createRunnerArtifactStore} from '../storage'

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
