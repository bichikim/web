import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createPlaybackToken} from '@pomo/playback-token'

import audioGateway, {createAudioCacheRequests} from '../index'

const CLAIMS = {
  assetId: '22222222-2222-4222-8222-222222222222',
  expiresAt: new Date('2026-08-22T01:15:00.000Z'),
  objectKey:
    'tracks/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/source.mp3',
  scope: 'full',
} as const
const SECRET = 'audio-gateway-secret-with-at-least-32-bytes'
const ALLOWED_ORIGINS: Env['ALLOWED_ORIGINS'] =
  'https://pomofi.io,https://www.pomofi.io,https://pomo-app.apps.tossmini.com,https://pomo-app.private-apps.tossmini.com,https://pomo-app.private-web.tossmini.com,https://pomo-app.web.tossmini.com,http://localhost:3000,http://localhost:3100,http://localhost:3200,http://localhost:3300,http://localhost:3400'

beforeEach(() => {
  vi.stubGlobal('caches', {default: {match: vi.fn().mockResolvedValue(undefined)}})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('audio cache requests', () => {
  it('should exclude the bearer token from a stable full-object cache key', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=secret-token`,
    )
    const result = createAudioCacheRequests(request, CLAIMS)

    expect(result.full.url).toBe(
      `https://audio.pomofi.io/_pomo_paid_audio_cache/${CLAIMS.objectKey}`,
    )
    expect(result.lookup.url).toBe(result.full.url)
    expect(result.full.url).not.toContain('secret-token')
  })

  it('should preserve Range only as a cache lookup instruction', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=another-token`,
      {headers: {Range: 'bytes=100-'}},
    )
    const result = createAudioCacheRequests(request, CLAIMS)

    expect(result.full.headers.get('Range')).toBeNull()
    expect(result.lookup.headers.get('Range')).toBe('bytes=100-')
    expect(result.lookup.url).toBe(result.full.url)
  })
})

describe('audio gateway authentication', () => {
  it('should normalize the shared secret and allow an Apps in Toss review origin', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Origin: 'https://pomo-app.private-apps.tossmini.com'}, method: 'HEAD'},
    )
    const workerRequest = request as unknown as Parameters<typeof audioGateway.fetch>[0]
    const object = {
      httpEtag: '"audio-etag"',
      size: 1024,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2Object
    const environment = {
      ALLOWED_ORIGINS,
      PAID_AUDIO: {head: vi.fn().mockResolvedValue(object)} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: ` ${SECRET} `,
    }

    const response = await audioGateway.fetch(workerRequest, environment, {} as ExecutionContext)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://pomo-app.private-apps.tossmini.com',
    )
    expect(environment.PAID_AUDIO.head).toHaveBeenCalledWith(CLAIMS.objectKey)
  })
})
