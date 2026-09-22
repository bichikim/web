/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {
  copyAiArtifactObject,
  createAiArtifactDownloadUrl,
  createAiArtifactIntermediateObjectKeyPrefix,
  createAiArtifactObjectKey,
  createAiArtifactObjectUrl,
  deleteAiArtifactObject,
  getAiArtifactLifecycle,
  listAiArtifactIntermediateObjectKeys,
  listAiArtifactTemporaryObjectKeys,
} from '../artifacts'

const ENVIRONMENT = {
  CLOUDFLARE_R2_ACCOUNT_ID: 'account-id',
  POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID: 'access-key',
  POMO_AI_ARTIFACT_R2_BUCKET: 'private-ai',
  POMO_AI_ARTIFACT_R2_PREFIX: 'production',
  POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY: 'secret-key',
}
const JOB_ID = '019d0000-0000-7000-8000-000000000001'

describe('AI artifact storage', () => {
  it('creates separate temporary and archive keys under the job boundary', () => {
    expect(createAiArtifactIntermediateObjectKeyPrefix(JOB_ID)).toBe(`ai/intermediate/${JOB_ID}`)
    expect(createAiArtifactObjectKey(JOB_ID, 'temporary', 'result.wav')).toBe(
      `ai/jobs/${JOB_ID}/temporary/result.wav`,
    )
    expect(createAiArtifactObjectKey(JOB_ID, 'archive', 'result.wav')).toBe(
      `ai/jobs/${JOB_ID}/archive/result.wav`,
    )
    expect(() => createAiArtifactObjectKey(JOB_ID, 'temporary', '../result.wav')).toThrow()
    expect(getAiArtifactLifecycle(`ai/jobs/${JOB_ID}/temporary/result.wav`)).toBe('temporary')
    expect(getAiArtifactLifecycle(`ai/jobs/${JOB_ID}/archive/result.wav`)).toBe('archive')
  })

  it('keeps artifact URLs private and signs each download for ten minutes', async () => {
    const signer = vi.fn(async (request: Request) => {
      const url = new URL(request.url)
      url.searchParams.set('X-Amz-Signature', 'signed')
      return new Request(url, request)
    })
    const objectKey = createAiArtifactObjectKey(JOB_ID, 'temporary', 'result.wav')

    expect(createAiArtifactObjectUrl(objectKey, ENVIRONMENT).toString()).toBe(
      `https://account-id.r2.cloudflarestorage.com/private-ai/production/${objectKey}`,
    )
    await expect(
      createAiArtifactDownloadUrl(objectKey, {
        environment: ENVIRONMENT,
        now: new Date('2026-09-20T00:00:00.000Z'),
        signRequest: signer,
      }),
    ).resolves.toMatchObject({
      expiresAt: new Date('2026-09-20T00:10:00.000Z'),
      url: expect.stringContaining('X-Amz-Signature=signed'),
    })
    expect(signer).toHaveBeenCalledWith(expect.any(Request), true)
    expect(new URL(signer.mock.calls[0]?.[0]?.url ?? '').searchParams.get('X-Amz-Expires')).toBe(
      '600',
    )
  })

  it('does not issue a result URL beyond the artifact expiry', async () => {
    const signer = vi.fn(async (request: Request) => request)
    const objectKey = createAiArtifactObjectKey(JOB_ID, 'temporary', 'result.wav')
    const now = new Date('2026-09-20T00:00:00.000Z')

    await expect(
      createAiArtifactDownloadUrl(objectKey, {
        environment: ENVIRONMENT,
        expiresAt: new Date('2026-09-20T00:00:30.500Z'),
        now,
        signRequest: signer,
      }),
    ).resolves.toMatchObject({expiresAt: new Date('2026-09-20T00:00:30.000Z')})
    expect(new URL(signer.mock.calls[0]?.[0]?.url ?? '').searchParams.get('X-Amz-Expires')).toBe(
      '30',
    )

    await expect(
      createAiArtifactDownloadUrl(objectKey, {
        environment: ENVIRONMENT,
        expiresAt: new Date('2026-09-20T00:00:00.500Z'),
        now,
        signRequest: signer,
      }),
    ).rejects.toThrow('expires before a usable download URL')
  })

  it('treats an already missing object as deleted and retries other failures', async () => {
    const signer = vi.fn(async (request: Request) => request)
    const objectKey = createAiArtifactObjectKey(JOB_ID, 'temporary', 'result.wav')

    await expect(
      deleteAiArtifactObject(objectKey, {
        environment: ENVIRONMENT,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 404})),
        signRequest: signer,
      }),
    ).resolves.toBeUndefined()

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503}))
    await expect(
      deleteAiArtifactObject(objectKey, {environment: ENVIRONMENT, fetcher, signRequest: signer}),
    ).rejects.toThrow('503')
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(signer).toHaveBeenCalledWith(expect.any(Request), false)
  })

  it('lists only intermediate objects under the requested job prefix', async () => {
    const xml = [
      '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>',
      `production/ai/intermediate/${JOB_ID}/raw.wav`,
      '</Key></Contents></ListBucketResult>',
    ].join('')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(xml, {status: 200}))

    await expect(
      listAiArtifactIntermediateObjectKeys(`ai/intermediate/${JOB_ID}`, {
        environment: ENVIRONMENT,
        fetcher,
        signRequest: async (request) => request,
      }),
    ).resolves.toEqual([`ai/intermediate/${JOB_ID}/raw.wav`])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(
      new URL(
        fetcher.mock.calls[0]?.[0] instanceof Request ? fetcher.mock.calls[0][0].url : '',
      ).searchParams.get('prefix'),
    ).toBe(`production/ai/intermediate/${JOB_ID}/`)
  })
})

it('should list only abandoned temporary results for the requested job', async () => {
  const objectKey = `ai/jobs/${JOB_ID}/temporary/result.wav`
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        [
          '<ListBucketResult><IsTruncated>false</IsTruncated><Contents>',
          `<Key>production/${objectKey}</Key>`,
          '</Contents></ListBucketResult>',
        ].join(''),
      ),
    )
  await expect(
    listAiArtifactTemporaryObjectKeys(JOB_ID, {
      environment: ENVIRONMENT,
      fetcher,
      signRequest: async (request) => request,
    }),
  ).resolves.toEqual([objectKey])
  const request = fetcher.mock.calls[0]?.[0]
  expect(request).toBeInstanceOf(Request)
  expect(new URL((request as Request).url).searchParams.get('prefix')).toBe(
    `production/ai/jobs/${JOB_ID}/temporary/`,
  )
})

it.each([
  `ai/jobs/${JOB_ID}/archive/result.wav`,
  'ai/jobs/019d0000-0000-7000-8000-000000000002/temporary/result.wav',
])('should reject a listed object outside the abandoned job prefix: %s', async (objectKey) => {
  await expect(
    listAiArtifactTemporaryObjectKeys(JOB_ID, {
      environment: ENVIRONMENT,
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            `<ListBucketResult><Contents><Key>production/${objectKey}</Key></Contents></ListBucketResult>`,
          ),
        ),
      signRequest: async (request) => request,
    }),
  ).rejects.toThrow('outside the requested prefix')
})

it.each(['delete', 'copy', 'list'] as const)(
  'should abort a stalled R2 %s operation at its deadline',
  async (operation) => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    const entered = Promise.withResolvers<Request>()
    const pending = Promise.withResolvers<Response>()
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const request = input as Request
      entered.resolve(request)
      request.signal.addEventListener('abort', () => pending.reject(request.signal.reason), {
        once: true,
      })
      return pending.promise
    })
    const options = {
      environment: ENVIRONMENT,
      fetcher,
      signRequest: async (request: Request) => request,
    }
    const objectKey = `ai/jobs/${JOB_ID}/temporary/result.wav`
    const run = () => {
      switch (operation) {
        case 'delete':
          return deleteAiArtifactObject(objectKey, options)
        case 'copy':
          return copyAiArtifactObject(objectKey, `ai/jobs/${JOB_ID}/archive/result.wav`, options)
        case 'list':
          return listAiArtifactIntermediateObjectKeys(`ai/intermediate/${JOB_ID}`, options)
      }
    }
    const result = run()
    const rejection = expect(result).rejects.toThrow()
    try {
      const request = await entered.promise
      controller.abort()
      expect(request.signal.aborted).toBe(true)
    } finally {
      pending.reject(new Error('test cleanup'))
      await rejection
      timeout.mockRestore()
    }
  },
)
