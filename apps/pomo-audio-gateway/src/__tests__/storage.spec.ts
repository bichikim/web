import {describe, expect, it, vi} from 'vitest'

import {
  createHeadObjectResponse,
  createRangedObjectResponse,
  createStorageObjectKey,
  isSingleByteRange,
} from '../storage'

const INFERRED_RANGE_CASES: ReadonlyArray<readonly [R2Range, string, string]> = [
  [{length: 3}, 'bytes 0-2/10', 'bytes=0-2'],
  [{offset: 7}, 'bytes 7-9/10', 'bytes=7-'],
]

describe('createStorageObjectKey', () => {
  it('should prepend a normalized storage prefix', () => {
    expect(createStorageObjectKey('tracks/asset/source.mp3', ' /previews/pr-123/ ')).toBe(
      'previews/pr-123/tracks/asset/source.mp3',
    )
  })

  it('should reject a prefix that can escape its storage namespace', () => {
    expect(() =>
      createStorageObjectKey('tracks/asset/source.mp3', 'previews/../production'),
    ).toThrow('R2_OBJECT_PREFIX is invalid')
  })
})

describe('isSingleByteRange', () => {
  it.each(['bytes=0-9', 'bytes=4-', 'bytes=-4'])(
    'should recognize the supported single-range syntax for %s',
    (rangeHeader) => {
      expect(isSingleByteRange(rangeHeader)).toBe(true)
    },
  )

  it.each(['bytes=abc', 'bytes=0-0,2-2', 'items=0-2'])(
    'should ignore unsupported or malformed range syntax for %s',
    (rangeHeader) => {
      expect(isSingleByteRange(rangeHeader)).toBe(false)
    },
  )
})

describe('createHeadObjectResponse', () => {
  it('should preserve the metadata-only browser cache contract', () => {
    const object = {
      httpEtag: '"audio-etag"',
      size: 10,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2Object

    const response = createHeadObjectResponse(object)

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600')
    expect(response.headers.get('Content-Length')).toBe('10')
    expect(response.headers.get('Cache-Tag')).toBeNull()
    expect(response.headers.get('X-Content-Type-Options')).toBeNull()
  })
})

describe('createRangedObjectResponse', () => {
  it('should translate an R2 range into an HTTP partial response', async () => {
    const body = new Response(new Uint8Array([4, 5, 6, 7])).body

    if (body === null) {
      throw new TypeError('Audio response body is unavailable')
    }

    const object = {
      body,
      httpEtag: '"audio-etag"',
      range: {length: 4, offset: 4},
      size: 10,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2ObjectBody

    const response = await createRangedObjectResponse(object, 'asset-id', 'bytes=4-7')

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Length')).toBe('4')
    expect(response.headers.get('Content-Range')).toBe('bytes 4-7/10')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6, 7]))
  })

  it('should reject a normalized range outside the object', async () => {
    const body = new Response(new Uint8Array([1])).body

    if (body === null) {
      throw new TypeError('Audio response body is unavailable')
    }

    const object = {
      body,
      httpEtag: '"audio-etag"',
      range: {length: 1, offset: 10},
      size: 10,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2ObjectBody

    const response = await createRangedObjectResponse(object, 'asset-id', 'bytes=10-')

    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */10')
  })

  it.each(['bytes=10-', 'bytes=7-4', 'bytes=-0', 'bytes=9007199254740992-'])(
    'should reject an unsatisfiable request normalized by R2 for %s',
    async (rangeHeader) => {
      const body = new Response(new Uint8Array(10)).body

      if (body === null) {
        throw new TypeError('Audio response body is unavailable')
      }

      const object = {
        body,
        httpEtag: '"audio-etag"',
        range: {length: 10, offset: 0},
        size: 10,
        writeHttpMetadata: vi.fn(),
      } as unknown as R2ObjectBody

      const response = await createRangedObjectResponse(object, 'asset-id', rangeHeader)

      expect(response.status).toBe(416)
      expect(response.headers.get('Content-Range')).toBe('bytes */10')
    },
  )

  it.each(INFERRED_RANGE_CASES)(
    'should fill omitted R2 range values for %o',
    async (range, contentRange, rangeHeader) => {
      const body = new Response(new Uint8Array([7, 8, 9])).body

      if (body === null) {
        throw new TypeError('Audio response body is unavailable')
      }

      const object = {
        body,
        httpEtag: '"audio-etag"',
        range,
        size: 10,
        writeHttpMetadata: vi.fn(),
      } as unknown as R2ObjectBody

      const response = await createRangedObjectResponse(object, 'asset-id', rangeHeader)

      expect(response.status).toBe(206)
      expect(response.headers.get('Content-Range')).toBe(contentRange)
    },
  )

  it('should preserve a range error when cancelling the unused body fails', async () => {
    const body = new ReadableStream({
      cancel: () => Promise.reject(new Error('cancel failed')),
    })
    const object = {
      body,
      httpEtag: '"audio-etag"',
      size: 10,
      writeHttpMetadata: vi.fn(),
    } as unknown as R2ObjectBody

    const response = await createRangedObjectResponse(object, 'asset-id', 'bytes=10-')

    expect(response.status).toBe(416)
  })
})
