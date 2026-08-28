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
const SECRET = 'pomo-audio-gateway-secret-with-at-least-32-bytes'
const ALLOWED_ORIGINS: Env['ALLOWED_ORIGINS'] =
  'https://pomofi.io,https://www.pomofi.io,https://pomo-app.apps.tossmini.com,https://pomo-app.private-apps.tossmini.com,https://pomo-app.private-web.tossmini.com,https://pomo-app.web.tossmini.com,http://localhost:3000,http://localhost:3100,http://localhost:3200,http://localhost:3300,http://localhost:3400,http://127.0.0.1:1420,http://tauri.localhost,https://tauri.localhost,tauri://localhost'
const BASE_ENVIRONMENT = {
  ALLOWED_ORIGIN_SUFFIXES: '',
  ALLOWED_ORIGINS,
  R2_OBJECT_PREFIX: '',
}

beforeEach(() => {
  vi.stubGlobal('caches', {
    default: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
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

  it('should isolate the cache key under the configured R2 prefix', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=secret-token`,
    )
    const result = createAudioCacheRequests(request, CLAIMS, ' /previews/pr-123/ ')

    expect(result.full.url).toBe(
      `https://audio.pomofi.io/_pomo_paid_audio_cache/previews/pr-123/${CLAIMS.objectKey}`,
    )
  })
})

describe('audio gateway authentication', () => {
  it.each(['https://pomo-app.private-apps.tossmini.com', 'tauri://localhost'])(
    'should normalize the shared secret and allow the configured origin %s',
    async (origin) => {
      vi.useFakeTimers()
      vi.setSystemTime('2026-08-22T01:00:00.000Z')
      const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
      const request = new Request(
        `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
        {headers: {Origin: origin}, method: 'HEAD'},
      )
      const workerRequest = request as unknown as Parameters<typeof audioGateway.fetch>[0]
      const object = {
        httpEtag: '"audio-etag"',
        size: 1024,
        writeHttpMetadata: vi.fn(),
      } as unknown as R2Object
      const environment = {
        ...BASE_ENVIRONMENT,
        ALLOWED_ORIGINS,
        PAID_AUDIO: {head: vi.fn().mockResolvedValue(object)} as unknown as R2Bucket,
        PLAYBACK_TOKEN_SECRET: ` ${SECRET} `,
      }

      const response = await audioGateway.fetch(workerRequest, environment, {} as ExecutionContext)

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(environment.PAID_AUDIO.head).toHaveBeenCalledWith(CLAIMS.objectKey)
    },
  )

  it('should allow an HTTPS Vercel Preview origin by suffix', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Origin: 'https://pomo-git-feature-team.vercel.app'}, method: 'HEAD'},
    )
    const object = {
      httpEtag: '"audio-etag"',
      size: 1024,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2Object
    const environment = {
      ...BASE_ENVIRONMENT,
      ALLOWED_ORIGIN_SUFFIXES: '.vercel.app',
      ALLOWED_ORIGINS: '',
      PAID_AUDIO: {head: vi.fn().mockResolvedValue(object)} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://pomo-git-feature-team.vercel.app',
    )
  })

  it.each([
    'http://pomo-git-feature-team.vercel.app',
    'https://vercel.app',
    'https://pomo.vercel.app.evil.example',
    'not-an-origin',
  ])('should reject a non-matching Preview origin %s', async (origin) => {
    const request = new Request('https://audio.pomofi.io/', {
      headers: {Origin: origin},
      method: 'OPTIONS',
    })
    const environment = {
      ...BASE_ENVIRONMENT,
      ALLOWED_ORIGIN_SUFFIXES: '.vercel.app',
      ALLOWED_ORIGINS: '',
      PAID_AUDIO: {} as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(401)
  })
})

describe('audio gateway request handling', () => {
  it('should convert an invalid origin configuration into a controlled gateway error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = new Request('https://audio.pomofi.io/anything', {
      headers: {Origin: 'https://pomofi.io'},
    })
    const environment = {
      PAID_AUDIO: {} as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    } as unknown as Parameters<typeof audioGateway.fetch>[1]

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({error: 'gateway_failed'})
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('should answer an allowed CORS preflight without authenticating', async () => {
    const request = new Request('https://audio.pomofi.io/anything', {
      headers: {
        'Access-Control-Request-Method': 'GET',
        Origin: 'https://pomofi.io',
      },
      method: 'OPTIONS',
    })
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {} as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Range')
  })

  it('should reject a preflight from an untrusted origin', async () => {
    const request = new Request('https://audio.pomofi.io/anything', {
      headers: {Origin: 'https://attacker.example'},
      method: 'OPTIONS',
    })
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {} as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(await response.json()).toEqual({error: 'origin_not_allowed'})
  })

  it('should expose unsupported-method errors to an allowed origin', async () => {
    const request = new Request(`https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3`, {
      headers: {Origin: 'https://pomofi.io'},
      method: 'POST',
    })
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {} as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(response.headers.get('Vary')).toContain('Origin')
    expect(await response.json()).toEqual({error: 'method_not_allowed'})
  })

  it('should expose authentication errors without reading cache or R2', async () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=invalid`,
      {headers: {Origin: 'https://pomofi.io'}},
    )
    const get = vi.fn()
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {get} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(caches.default.match).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  })

  it('should return a cached full response without reading R2', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
    )
    vi.mocked(caches.default.match).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {'Content-Type': 'audio/mpeg'},
      }),
    )
    const get = vi.fn()
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {get} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.headers.get('X-Pomo-Cache')).toBe('HIT')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(get).not.toHaveBeenCalled()
  })

  it('should return not found when the authenticated R2 object is absent', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Origin: 'https://pomofi.io'}},
    )
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {get: vi.fn().mockResolvedValue(null)} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(response.headers.get('Vary')).toContain('Origin')
    expect(await response.json()).toEqual({error: 'audio_not_found'})
  })

  it('should expose unexpected gateway failures to an allowed origin', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Origin: 'https://pomofi.io'}},
    )
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {
        get: vi.fn().mockRejectedValue(new Error('R2 unavailable')),
      } as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(response.headers.get('Vary')).toContain('Origin')
    expect(await response.json()).toEqual({error: 'gateway_failed'})
    expect(consoleError).toHaveBeenCalledOnce()
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
      ...BASE_ENVIRONMENT,
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

  it('should read and cache an object under the configured Preview prefix', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
    )
    const body = new Response(new Uint8Array([1, 2, 3])).body

    if (body === null) {
      throw new TypeError('Audio response body is unavailable')
    }

    const object = {
      body,
      httpEtag: '"audio-etag"',
      size: 3,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2ObjectBody
    const get = vi.fn().mockResolvedValue(object)
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {get} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
      R2_OBJECT_PREFIX: ' /previews/pr-123/ ',
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {waitUntil: vi.fn()} as unknown as ExecutionContext,
    )

    expect(response.status).toBe(200)
    expect(get).toHaveBeenCalledWith(`previews/pr-123/${CLAIMS.objectKey}`)
    const [cacheRequest, cacheResponse] = vi.mocked(caches.default.put).mock.calls[0] ?? []

    expect(cacheRequest).toBeInstanceOf(Request)
    expect(cacheResponse).toBeInstanceOf(Response)

    if (!(cacheRequest instanceof Request) || !(cacheResponse instanceof Response)) {
      throw new TypeError('Expected a cache request and response')
    }

    expect(cacheRequest.url).toContain(`previews/pr-123/${CLAIMS.objectKey}`)
    expect(cacheResponse.status).toBe(200)
  })

  it('should reject an unsafe R2 prefix as a gateway configuration failure', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {method: 'HEAD'},
    )
    const environment = {
      ...BASE_ENVIRONMENT,
      PAID_AUDIO: {head: vi.fn()} as unknown as R2Bucket,
      PLAYBACK_TOKEN_SECRET: SECRET,
      R2_OBJECT_PREFIX: 'previews/../production',
    }

    const response = await audioGateway.fetch(
      request as unknown as Parameters<typeof audioGateway.fetch>[0],
      environment,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(500)
    expect(environment.PAID_AUDIO.head).not.toHaveBeenCalled()
  })
})
