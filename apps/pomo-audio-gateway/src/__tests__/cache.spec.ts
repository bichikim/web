import {describe, expect, it} from 'vitest'

import {createAudioCacheRequests, createClientResponse} from '../cache'

const CLAIMS = {
  assetId: '22222222-2222-4222-8222-222222222222',
  expiresAt: new Date('2026-08-22T01:15:00.000Z'),
  objectKey:
    'tracks/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/source.mp3',
  scope: 'full',
} as const

describe('createAudioCacheRequests', () => {
  it('should exclude the bearer token from a stable full-object cache key', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=secret-token`,
    )
    const result = createAudioCacheRequests(request, CLAIMS.objectKey)

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
    const result = createAudioCacheRequests(request, CLAIMS.objectKey)

    expect(result.full.headers.get('Range')).toBeNull()
    expect(result.lookup.headers.get('Range')).toBe('bytes=100-')
    expect(result.lookup.url).toBe(result.full.url)
  })

  it('should omit a Range header when the gateway ignores it', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=another-token`,
      {headers: {Range: 'bytes=0-0,2-2'}},
    )
    const result = createAudioCacheRequests(request, CLAIMS.objectKey, null)

    expect(result.lookup).toBe(result.full)
    expect(result.lookup.headers.get('Range')).toBeNull()
  })

  it('should isolate the cache key under the configured storage prefix', () => {
    const request = new Request(
      `https://audio.pomofi.io/tracks/${CLAIMS.assetId}/source.mp3?token=secret-token`,
    )
    const result = createAudioCacheRequests(request, `previews/pr-123/${CLAIMS.objectKey}`)

    expect(result.full.url).toBe(
      `https://audio.pomofi.io/_pomo_paid_audio_cache/previews/pr-123/${CLAIMS.objectKey}`,
    )
  })
})

describe('createClientResponse', () => {
  it('should expose cache status and browser cache policy without consuming the body', async () => {
    const source = new Response(new Uint8Array([1, 2, 3]), {
      headers: {'Content-Type': 'audio/mpeg'},
    })

    const response = createClientResponse(source, 'https://pomofi.io', 'HIT')

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600')
    expect(response.headers.get('X-Pomo-Cache')).toBe('HIT')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofi.io')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
})
