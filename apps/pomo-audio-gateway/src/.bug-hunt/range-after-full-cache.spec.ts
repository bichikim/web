/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createPlaybackToken} from '@pomo/playback-token'

import {type AudioCache, type AudioGatewayConfig, handleAudioGatewayRequest} from '../gateway'

const CLAIMS = {
  assetId: '22222222-2222-4222-8222-222222222222',
  expiresAt: new Date('2026-08-22T01:15:00.000Z'),
  objectKey:
    'tracks/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/source.mp3',
  scope: 'full',
} as const
const SECRET = 'pomo-audio-gateway-secret-with-at-least-32-bytes'

const createMemoryCache = (): AudioCache => {
  const store = new Map<string, Response>()
  const keyFor = (request: Request): string => {
    const range = request.headers.get('Range')
    return `${request.url}|${range ?? ''}`
  }

  return {
    match: async (request) => store.get(keyFor(request)),
    put: async (request, response) => {
      store.set(keyFor(request), response.clone())
    },
  }
}

const createConfig = (): AudioGatewayConfig => ({
  allowedOrigins: '',
  allowedOriginSuffixes: '',
  playbackTokenSecret: SECRET,
  storagePrefix: '',
})

const createFullObject = (bytes: readonly number[]): R2ObjectBody => {
  const body = new Response(new Uint8Array(bytes)).body

  if (body === null) {
    throw new TypeError('Audio response body is unavailable')
  }

  return {
    body,
    httpEtag: '"audio-etag"',
    size: bytes.length,
    writeHttpMetadata: vi.fn(),
  } as unknown as R2ObjectBody
}

describe('paid audio gateway cache contract', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-08-22T01:00:00.000Z')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should serve a Range GET from the cached full object without another R2 read', async () => {
    const token = await createPlaybackToken({...CLAIMS, secret: SECRET})
    const cache = createMemoryCache()
    const fullBytes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const get = vi.fn().mockResolvedValue(createFullObject(fullBytes))
    const waitUntil = vi.fn((promise: Promise<void>) => {
      void promise
    })
    const config = createConfig()

    const fullRequest = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
    )
    const fullResponse = await handleAudioGatewayRequest({
      cache,
      config,
      request: fullRequest,
      storage: {get, head: vi.fn()} as unknown as AudioStorage,
      waitUntil,
    })

    expect(fullResponse.status).toBe(200)
    expect(get).toHaveBeenCalledTimes(1)
    await waitUntil.mock.calls[0]?.[0]

    const rangeRequest = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=${token}`,
      {headers: {Range: 'bytes=4-7'}},
    )

    await handleAudioGatewayRequest({
      cache,
      config,
      request: rangeRequest,
      storage: {get, head: vi.fn()} as unknown as AudioStorage,
      waitUntil,
    })

    expect(get).toHaveBeenCalledTimes(1)
  })
})

interface AudioStorage {
  get(key: string, options?: {readonly range: Headers}): Promise<R2ObjectBody | null>
  head(key: string): Promise<R2Object | null>
}
