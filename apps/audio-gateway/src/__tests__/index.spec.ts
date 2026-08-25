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
  vi.stubGlobal('caches', {
    default: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  })
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

describe('audio gateway range requests', () => {
  interface RangeFixture {
    readonly bytes: readonly number[]
    readonly contentRange: string
    readonly objectRange?: R2Range
    readonly rangeHeader: string
    readonly status: number
  }

  const expectRangeResponse = async ({
    bytes,
    contentRange,
    objectRange,
    rangeHeader,
    status,
  }: RangeFixture): Promise<void> => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Range: rangeHeader}},
    )
    const workerRequest = request as unknown as Parameters<typeof audioGateway.fetch>[0]
    const body = new Response(new Uint8Array(bytes)).body

    if (body === null) {
      throw new TypeError('Audio response body is unavailable')
    }

    const object = {
      body,
      httpEtag: '"audio-etag"',
      range: objectRange,
      size: 10,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2ObjectBody
    const fullBody = new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).body

    if (fullBody === null) {
      throw new TypeError('Full audio response body is unavailable')
    }

    const fullObject = {...object, body: fullBody, range: undefined} as unknown as R2ObjectBody
    const get = vi.fn().mockResolvedValueOnce(object).mockResolvedValueOnce(fullObject)
    const waitUntil = vi.fn()
    const environment = {
      ALLOWED_ORIGINS,
      PAID_AUDIO: {get} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(workerRequest, environment, {
      waitUntil,
    } as unknown as ExecutionContext)

    expect(get).toHaveBeenCalledWith(CLAIMS.objectKey, {range: request.headers})
    expect(response.status).toBe(status)
    expect(response.headers.get('Cache-Control')).toBe(
      status === 206 ? 'private, max-age=3600' : 'no-store',
    )
    expect(response.headers.get('Content-Length')).toBe(
      status === 206 ? bytes.length.toString() : null,
    )
    expect(response.headers.get('Content-Range')).toBe(contentRange)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      status === 206 ? new Uint8Array(bytes) : new Uint8Array(),
    )

    if (status === 206) {
      expect(waitUntil).toHaveBeenCalledOnce()
      await waitUntil.mock.calls[0]?.[0]
      expect(get).toHaveBeenNthCalledWith(2, CLAIMS.objectKey)
      expect(caches.default.put).toHaveBeenCalledWith(
        expect.objectContaining({url: expect.stringContaining(CLAIMS.objectKey)}),
        expect.objectContaining({status: 200}),
      )
    } else {
      expect(waitUntil).not.toHaveBeenCalled()
    }
  }

  it('should serve a bounded range from R2 on a cache miss', async () => {
    await expectRangeResponse({
      bytes: [4, 5, 6, 7],
      contentRange: 'bytes 4-7/10',
      objectRange: {length: 4, offset: 4},
      rangeHeader: 'bytes=4-7',
      status: 206,
    })
  })

  it('should serve an open-ended range from R2 on a cache miss', async () => {
    await expectRangeResponse({
      bytes: [4, 5, 6, 7, 8, 9],
      contentRange: 'bytes 4-9/10',
      objectRange: {length: 6, offset: 4},
      rangeHeader: 'bytes=4-',
      status: 206,
    })
  })

  it('should serve a suffix range from R2 on a cache miss', async () => {
    await expectRangeResponse({
      bytes: [7, 8, 9],
      contentRange: 'bytes 7-9/10',
      objectRange: {suffix: 3},
      rangeHeader: 'bytes=-3',
      status: 206,
    })
  })

  it('should reject a range that R2 cannot satisfy', async () => {
    await expectRangeResponse({
      bytes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      contentRange: 'bytes */10',
      rangeHeader: 'bytes=10-',
      status: 416,
    })
  })
})
