import {afterEach, expect, it, vi} from 'vitest'

import {createPlaybackToken} from '@pomo/playback-token'

import audioGateway from '../index'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should connect the Worker cache and environment to the gateway', async () => {
  vi.useFakeTimers()
  vi.setSystemTime('2026-08-22T01:00:00.000Z')
  const claims = {
    assetId: '22222222-2222-4222-8222-222222222222',
    expiresAt: new Date('2026-08-22T01:15:00.000Z'),
    objectKey:
      'tracks/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/source.mp3',
    scope: 'full',
  } as const
  const secret = 'pomo-audio-gateway-secret-with-at-least-32-bytes'
  const token = await createPlaybackToken({...claims, secret})
  const match = vi.fn().mockResolvedValue(undefined)
  const put = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('caches', {
    default: {match, put},
  })
  const body = new Response(new Uint8Array([1, 2, 3])).body

  if (body === null) {
    throw new TypeError('Audio response body is unavailable')
  }

  const get = vi.fn().mockResolvedValue({
    body,
    httpEtag: '"audio-etag"',
    size: 3,
    writeHttpMetadata: vi.fn(),
  } as unknown as R2ObjectBody)
  const environment = {
    ALLOWED_ORIGIN_SUFFIXES: '',
    ALLOWED_ORIGINS: '',
    PAID_AUDIO: {get} as unknown as R2Bucket,
    PLAYBACK_TOKEN_SECRET: secret,
    R2_OBJECT_PREFIX: '',
  } as unknown as Parameters<typeof audioGateway.fetch>[1]
  const request = new Request(
    `https://audio.pomofi.io/tracks/${claims.assetId}/source.mp3?token=${token}`,
  )

  const waitUntil = vi.fn()
  const response = await audioGateway.fetch(
    request as unknown as Parameters<typeof audioGateway.fetch>[0],
    environment,
    {waitUntil} as unknown as ExecutionContext,
  )

  expect(response.headers.get('X-Pomo-Cache')).toBe('MISS')
  expect(match).toHaveBeenCalledOnce()
  expect(get).toHaveBeenCalledOnce()
  expect(waitUntil).toHaveBeenCalledOnce()
  await waitUntil.mock.calls[0]?.[0]
  expect(put).toHaveBeenCalledOnce()
})
