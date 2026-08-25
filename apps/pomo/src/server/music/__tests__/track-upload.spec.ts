// oxlint-disable no-magic-numbers -- MP3 fixtures use fixed frame sizes and binary headers.
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  parseWebStream: vi.fn(),
  sign: vi.fn(),
}))

vi.mock('aws4fetch', () => ({
  AwsClient: class {
    public readonly sign = dependencyMocks.sign
  },
}))

vi.mock('music-metadata', () => ({parseWebStream: dependencyMocks.parseWebStream}))

import {
  createTrackPlayback,
  createTrackPreviewKey,
  createTrackPreviewObject,
  createTrackUpload,
  deleteTrackObject,
  ensureTrackPreviewObject,
  inspectTrackUpload,
  isTrackValidationError,
  MAXIMUM_TRACK_BYTES,
  readTrackPreviewObject,
} from '../track-upload'

const OBJECT_KEY =
  'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3'
const environment = {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'}
const PREVIEW_INPUT_END = 2_097_151

beforeEach(() => {
  dependencyMocks.sign.mockImplementation(async (request: Request) => request)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const createMp3Frames = (frameCount: number): ArrayBuffer => {
  const frameBytes = 417
  const bytes = new Uint8Array(frameBytes * frameCount)

  for (let index = 0; index < frameCount; index += 1) {
    bytes.set([0xff, 0xfb, 0x90, 0x00], index * frameBytes)
  }

  return bytes.buffer
}

describe('createTrackUpload', () => {
  it('should create a short-lived signed PUT URL constrained to audio MPEG', async () => {
    const signRequest = vi.fn(async (request: Request) => {
      const url = new URL(request.url)
      url.searchParams.set('X-Amz-Signature', 'signature')
      return new Request(url, request)
    })
    const result = await createTrackUpload(OBJECT_KEY, {environment, signRequest})
    const request = signRequest.mock.calls[0]?.[0]

    expect(result.uploadUrl).toContain('X-Amz-Signature=signature')
    expect(request?.method).toBe('PUT')
    expect(request?.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(request?.url).toContain('X-Amz-Expires=900')
    expect(signRequest).toHaveBeenCalledWith(expect.any(Request), true)
  })
})

describe('inspectTrackUpload', () => {
  it('should return server-inspected MPEG layer 3 metadata', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('mp3', {
        headers: {'Content-Length': '1234', 'Content-Type': 'audio/mpeg', ETag: 'etag-value'},
      }),
    )
    const parseAudio = vi.fn().mockResolvedValue({
      format: {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 12.345},
    })
    const result = await inspectTrackUpload(OBJECT_KEY, {
      environment,
      fetcher,
      parseAudio,
      signRequest: async (request) => request,
    })

    expect(result).toEqual({durationMs: 12_345, etag: 'etag-value', sizeBytes: 1234n})
    expect(parseAudio).toHaveBeenCalledWith(expect.any(ReadableStream), {
      mimeType: 'audio/mpeg',
      size: 1234,
    })
  })

  it('should extract a supported embedded front cover during upload inspection', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
    const result = await inspectTrackUpload(OBJECT_KEY, {
      environment,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        new Response('mp3', {
          headers: {'Content-Length': '1234', ETag: 'etag-value'},
        }),
      ),
      parseAudio: vi.fn().mockResolvedValue({
        common: {
          picture: [
            {data: new Uint8Array([1]), format: 'image/jpeg'},
            {data: png, format: 'image/png', type: 'Cover (front)'},
          ],
        },
        format: {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 12.345},
      }),
      signRequest: async (request) => request,
    })

    expect(result.artwork?.contentType).toBe('image/png')
    expect(new Uint8Array(result.artwork?.body ?? new ArrayBuffer(0))).toEqual(png)
  })

  it('should reject a file that is not MPEG layer 3', () =>
    expect(
      inspectTrackUpload(OBJECT_KEY, {
        environment,
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('wav', {headers: {'Content-Length': '1234', ETag: 'etag-value'}}),
          ),
        parseAudio: vi.fn().mockResolvedValue({
          format: {codec: 'PCM', container: 'WAVE', duration: 12},
        }),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('invalid_mp3'))
})

describe('isTrackValidationError', () => {
  it('should recognize only expected MP3 validation failures', () => {
    expect(isTrackValidationError(new TypeError('invalid_mp3'))).toBe(true)
    expect(isTrackValidationError(new TypeError('invalid_mp3_frames'))).toBe(true)
    expect(isTrackValidationError(new TypeError('CLOUDFLARE_R2_ACCOUNT_ID is not set'))).toBe(false)
    expect(isTrackValidationError(new Error('invalid_mp3'))).toBe(false)
  })
})

describe('deleteTrackObject', () => {
  it('should send a signed DELETE request to R2', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 204}))
    const signRequest = vi.fn(async (request: Request) => request)

    await deleteTrackObject(OBJECT_KEY, {environment, fetcher, signRequest})

    expect(signRequest).toHaveBeenCalledWith(expect.any(Request), false)
    const requests = fetcher.mock.calls.map(([request]) => request)

    if (requests.some((request) => !(request instanceof Request))) {
      throw new TypeError('R2 삭제 요청을 찾지 못했습니다.')
    }

    expect(requests).toHaveLength(3)
    expect(
      requests.every((request) => request instanceof Request && request.method === 'DELETE'),
    ).toBe(true)
    expect(
      requests.some(
        (request) => request instanceof Request && request.url.includes('/preview-v1.mp3'),
      ),
    ).toBe(true)
  })

  it('should reject when R2 does not delete the object', () =>
    expect(
      deleteTrackObject(OBJECT_KEY, {
        environment,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 track delete failed with status 503'))
})

describe('createTrackPlayback', () => {
  it('should create a short-lived signed GET URL for direct R2 playback', async () => {
    const signRequest = vi.fn(async (request: Request) => {
      const url = new URL(request.url)
      url.searchParams.set('X-Amz-Signature', 'signature')
      return new Request(url, request)
    })
    const result = await createTrackPlayback(OBJECT_KEY, {environment, signRequest})
    const request = signRequest.mock.calls[0]?.[0]

    expect(result.url).toContain('X-Amz-Signature=signature')
    expect(result.expiresAt).toBeInstanceOf(Date)
    expect(request?.method).toBe('GET')
    expect(request?.url).toContain('X-Amz-Expires=900')
    expect(signRequest).toHaveBeenCalledWith(expect.any(Request), true)
  })
})

describe('createTrackPreviewObject', () => {
  it('should read a bounded source range and store a frame-bounded preview object', async () => {
    const source = createMp3Frames(1200)
    const requests: Request[] = []
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (request) => {
      if (!(request instanceof Request)) {
        throw new TypeError('Expected an R2 Request')
      }

      requests.push(request)
      return requests.length === 1
        ? new Response(source, {
            headers: {'Content-Length': source.byteLength.toString()},
            status: 206,
          })
        : new Response(null, {status: 200})
    })

    await createTrackPreviewObject(OBJECT_KEY, 180_000, {
      environment,
      fetcher,
      signRequest: async (request) => request,
    })

    expect(requests[0]?.headers.get('Range')).toBe(`bytes=0-${PREVIEW_INPUT_END}`)
    expect(requests[1]?.method).toBe('PUT')
    expect(requests[1]?.url).toContain('/preview-v1.mp3')
    expect(Number(requests[1]?.headers.get('Content-Length'))).toBeLessThan(source.byteLength)
  })

  it('should reject a source response beyond the bounded parsing limit', async () => {
    await expect(
      createTrackPreviewObject(OBJECT_KEY, 180_000, {
        environment,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(
          new Response('oversized', {
            headers: {'Content-Length': (PREVIEW_INPUT_END + 2).toString()},
            status: 206,
          }),
        ),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 bounded track read failed')
  })
})

describe('createTrackPreviewKey', () => {
  it('should create the immutable preview key next to the source object', () => {
    expect(createTrackPreviewKey(OBJECT_KEY)).toBe(
      'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/preview-v1.mp3',
    )
  })

  it('should reject a key that does not identify a source MP3', () => {
    expect(() => createTrackPreviewKey('tracks/not-source.mp3')).toThrow('invalid_track_object_key')
  })
})

describe('R2 environment', () => {
  it('should use trimmed custom R2 values and the built-in signer', async () => {
    const result = await createTrackUpload(OBJECT_KEY, {
      environment: {
        CLOUDFLARE_R2_ACCOUNT_ID: ' account-id ',
        POMO_PAID_AUDIO_R2_ACCESS_KEY_ID: ' access-key ',
        POMO_PAID_AUDIO_R2_BUCKET: ' custom-bucket ',
        POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY: ' secret-key ',
      },
    })

    expect(result.uploadUrl).toContain('account-id.r2.cloudflarestorage.com/custom-bucket/')
    expect(dependencyMocks.sign).toHaveBeenCalledWith(expect.any(Request), {
      aws: {signQuery: true},
    })
  })

  it('should fall back to public asset credentials', async () => {
    await createTrackPlayback(OBJECT_KEY, {
      environment: {
        CLOUDFLARE_R2_ACCOUNT_ID: 'account-id',
        POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID: 'public-access-key',
        POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY: 'public-secret-key',
      },
    })

    expect(dependencyMocks.sign).toHaveBeenCalledWith(expect.any(Request), {
      aws: {signQuery: true},
    })
  })

  it('should reject missing or blank required R2 values', async () => {
    await expect(createTrackUpload(OBJECT_KEY, {environment: {}})).rejects.toThrow(
      'CLOUDFLARE_R2_ACCOUNT_ID is not set',
    )
    await expect(
      createTrackUpload(OBJECT_KEY, {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: '   '},
      }),
    ).rejects.toThrow('CLOUDFLARE_R2_ACCOUNT_ID is not set')
    await expect(
      createTrackUpload(OBJECT_KEY, {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
      }),
    ).rejects.toThrow('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID is not set')
    await expect(
      createTrackUpload(OBJECT_KEY, {
        environment: {
          CLOUDFLARE_R2_ACCOUNT_ID: 'account-id',
          POMO_PAID_AUDIO_R2_ACCESS_KEY_ID: 'access-key',
        },
      }),
    ).rejects.toThrow('POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY is not set')
  })

  it('should use process environment and default options', async () => {
    vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'account-id')
    vi.stubEnv('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID', 'access-key')
    vi.stubEnv('POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY', 'secret-key')

    const upload = await createTrackUpload(OBJECT_KEY)
    const playback = await createTrackPlayback(OBJECT_KEY)

    expect(upload.uploadUrl).toContain('/pomofi-paid-audio/')
    expect(playback.url).toContain('/pomofi-paid-audio/')
  })
})

describe('track artwork inspection', () => {
  const inspectArtwork = (pictures?: ReadonlyArray<Record<string, unknown>>) =>
    inspectTrackUpload(OBJECT_KEY, {
      environment,
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response('mp3', {headers: {'Content-Length': '1234', ETag: 'etag-value'}}),
        ),
      parseAudio: vi.fn().mockResolvedValue({
        common: pictures === undefined ? {} : {picture: pictures},
        format: {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 1},
      }),
      signRequest: async (request) => request,
    })

  it('should support JPEG aliases and WebP signatures', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 1])
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 2])
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])

    await expect(inspectArtwork([{data: jpeg, format: 'IMAGE/JPEG'}])).resolves.toMatchObject({
      artwork: {contentType: 'image/jpeg'},
    })
    await expect(inspectArtwork([{data: jpg, format: 'image/jpg'}])).resolves.toMatchObject({
      artwork: {contentType: 'image/jpeg'},
    })
    await expect(inspectArtwork([{data: webp, format: 'image/webp'}])).resolves.toMatchObject({
      artwork: {contentType: 'image/webp'},
    })
  })

  it('should skip unsupported, malformed, and oversized pictures', async () => {
    const oversizedJpeg = new Uint8Array(4 * 1024 * 1024 + 1)
    oversizedJpeg.set([0xff, 0xd8, 0xff])
    const malformedWebpRiff = new Uint8Array(12)
    const malformedWebpType = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x4e, 0x4f, 0x50, 0x45,
    ])

    await expect(
      inspectArtwork([
        {data: new Uint8Array([0xff, 0xd8, 0]), format: 'image/jpeg', type: 'Back'},
        {data: new Uint8Array([0]), format: 'image/png'},
        {data: malformedWebpRiff, format: 'image/webp', type: 'Cover (front)'},
        {data: malformedWebpType, format: 'image/webp'},
        {data: oversizedJpeg, format: 'image/jpeg'},
        {data: new Uint8Array([1]), format: 'image/gif'},
      ]),
    ).resolves.not.toHaveProperty('artwork')
    await expect(inspectArtwork()).resolves.not.toHaveProperty('artwork')
  })
})

describe('preview object reads', () => {
  const readWith = (response: Response) =>
    readTrackPreviewObject(OBJECT_KEY, {
      environment,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(response),
      signRequest: async (request) => request,
    })

  it('should return a bounded preview stream and its metadata', async () => {
    const result = await readWith(
      new Response('preview', {headers: {'Content-Length': '7', ETag: 'preview-etag'}}),
    )

    expect(result).toMatchObject({contentLength: 7, etag: 'preview-etag'})
    expect(result?.body).toBeInstanceOf(ReadableStream)
  })

  it('should allow a preview without an ETag', async () => {
    await expect(
      readWith(new Response('preview', {headers: {'Content-Length': '7'}})),
    ).resolves.toMatchObject({etag: null})
  })

  it('should return null when the preview does not exist', async () => {
    await expect(readWith(new Response(null, {status: 404}))).resolves.toBeNull()
  })

  it.each([
    ['an unsuccessful response', new Response('error', {status: 503})],
    ['a missing response body', new Response(null, {headers: {'Content-Length': '1'}})],
    ['a missing content length', new Response('preview')],
    ['a non-integer content length', new Response('preview', {headers: {'Content-Length': '1.5'}})],
    ['a zero content length', new Response('preview', {headers: {'Content-Length': '0'}})],
    [
      'an oversized content length',
      new Response('preview', {headers: {'Content-Length': '2097153'}}),
    ],
  ])('should reject %s', async (_name, response) => {
    await expect(readWith(response)).rejects.toThrow('R2 track preview read failed')
  })
})

describe('preview object creation', () => {
  it.each([Number.NaN, 0])('should reject invalid duration %s', async (durationMs) => {
    await expect(
      createTrackPreviewObject(OBJECT_KEY, durationMs, {
        environment,
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('invalid_track_duration')
  })

  it.each([
    ['an unsuccessful response', new Response('error', {status: 503})],
    ['a missing content length', new Response('source', {status: 206})],
    [
      'a non-integer content length',
      new Response('source', {headers: {'Content-Length': '1.5'}, status: 206}),
    ],
    [
      'a zero content length',
      new Response('source', {headers: {'Content-Length': '0'}, status: 206}),
    ],
  ])('should reject source response with %s', async (_name, response) => {
    await expect(
      createTrackPreviewObject(OBJECT_KEY, 1000, {
        environment,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(response),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 bounded track read failed')
  })

  it('should reject a source body that differs from its declared length', async () => {
    await expect(
      createTrackPreviewObject(OBJECT_KEY, 1000, {
        environment,
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('source', {headers: {'Content-Length': '7'}, status: 206}),
          ),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 bounded track read returned an invalid body length')
  })

  it('should reject a failed preview write', async () => {
    const source = createMp3Frames(4)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(source, {
          headers: {'Content-Length': source.byteLength.toString()},
          status: 206,
        }),
      )
      .mockResolvedValueOnce(new Response('error', {status: 503}))

    await expect(
      createTrackPreviewObject(OBJECT_KEY, 1000, {
        environment,
        fetcher,
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 track preview write failed with status 503')
  })
})

describe('ensureTrackPreviewObject', () => {
  it('should return an existing preview without rewriting it', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('preview', {headers: {'Content-Length': '7'}}))

    const result = await ensureTrackPreviewObject(OBJECT_KEY, 1000, {
      environment,
      fetcher,
      signRequest: async (request) => request,
    })

    expect(result.contentLength).toBe(7)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('should create and reread a missing preview', async () => {
    const source = createMp3Frames(4)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, {status: 404}))
      .mockResolvedValueOnce(
        new Response(source, {
          headers: {'Content-Length': source.byteLength.toString()},
          status: 206,
        }),
      )
      .mockResolvedValueOnce(new Response(null, {status: 200}))
      .mockResolvedValueOnce(
        new Response('preview', {headers: {'Content-Length': '7', ETag: 'created'}}),
      )

    await expect(
      ensureTrackPreviewObject(OBJECT_KEY, 1000, {
        environment,
        fetcher,
        signRequest: async (request) => request,
      }),
    ).resolves.toMatchObject({contentLength: 7, etag: 'created'})
  })

  it('should reject when a created preview remains unreadable', async () => {
    const source = createMp3Frames(4)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, {status: 404}))
      .mockResolvedValueOnce(
        new Response(source, {
          headers: {'Content-Length': source.byteLength.toString()},
          status: 206,
        }),
      )
      .mockResolvedValueOnce(new Response(null, {status: 200}))
      .mockResolvedValueOnce(new Response(null, {status: 404}))

    await expect(
      ensureTrackPreviewObject(OBJECT_KEY, 1000, {
        environment,
        fetcher,
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 track preview was not readable after creation')
  })
})

describe('track response validation', () => {
  const inspectWith = (response: Response, metadata = {}) =>
    inspectTrackUpload(OBJECT_KEY, {
      environment,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(response),
      parseAudio: vi.fn().mockResolvedValue(metadata),
      signRequest: async (request) => request,
    })

  it('should reject an unsuccessful or bodyless track response', async () => {
    await expect(inspectWith(new Response('error', {status: 503}))).rejects.toThrow(
      'R2 track read failed with status 503',
    )
    await expect(inspectWith(new Response(null, {status: 200}))).rejects.toThrow(
      'R2 track read failed with status 200',
    )
  })

  it.each([
    ['a missing size', {ETag: 'etag'}],
    ['a non-integer size', {'Content-Length': '1.5', ETag: 'etag'}],
    ['a zero size', {'Content-Length': '0', ETag: 'etag'}],
    ['an oversized size', {'Content-Length': String(MAXIMUM_TRACK_BYTES + 1), ETag: 'etag'}],
    ['a missing ETag', {'Content-Length': '1'}],
  ])('should reject metadata with %s', async (_name, headers) => {
    await expect(inspectWith(new Response('track', {headers}))).rejects.toThrow(
      'invalid_track_metadata',
    )
  })

  it.each([
    ['a non-MPEG container', {codec: 'MPEG 1 Layer 3', container: 'WAVE', duration: 1}],
    ['a missing codec', {container: 'MPEG', duration: 1}],
    ['a non-layer-3 codec', {codec: 'MPEG 1 Layer 2', container: 'MPEG', duration: 1}],
    ['a missing duration', {codec: 'MPEG 1 Layer 3', container: 'MPEG'}],
    ['a non-finite duration', {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: Infinity}],
    ['a zero duration', {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 0}],
  ])('should reject MP3 metadata with %s', async (_name, format) => {
    await expect(
      inspectWith(new Response('track', {headers: {'Content-Length': '5', ETag: 'etag'}}), {
        format,
      }),
    ).rejects.toThrow('invalid_mp3')
  })

  it('should use the default metadata parser', async () => {
    dependencyMocks.parseWebStream.mockResolvedValue({
      format: {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 2},
    })

    await expect(
      inspectTrackUpload(OBJECT_KEY, {
        environment,
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('track', {headers: {'Content-Length': '5', ETag: 'etag'}}),
          ),
        signRequest: async (request) => request,
      }),
    ).resolves.toMatchObject({durationMs: 2000})
    expect(dependencyMocks.parseWebStream).toHaveBeenCalledWith(
      expect.any(ReadableStream),
      {mimeType: 'audio/mpeg', size: 5},
      {duration: true},
    )
  })
})

describe('default fetch and deletion tolerance', () => {
  const stubR2Environment = () => {
    vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'account-id')
    vi.stubEnv('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID', 'access-key')
    vi.stubEnv('POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY', 'secret-key')
  }

  it('should use the global fetcher for preview reads', async () => {
    stubR2Environment()
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('preview', {headers: {'Content-Length': '7'}})),
    )

    await expect(readTrackPreviewObject(OBJECT_KEY)).resolves.toMatchObject({contentLength: 7})
  })

  it('should use the global fetcher for preview creation', async () => {
    stubR2Environment()
    const source = createMp3Frames(4)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(source, {
          headers: {'Content-Length': source.byteLength.toString()},
          status: 206,
        }),
      )
      .mockResolvedValueOnce(new Response(null, {status: 200}))
    vi.stubGlobal('fetch', fetcher)

    await createTrackPreviewObject(OBJECT_KEY, 1000)

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should use the global fetcher for inspection', async () => {
    stubR2Environment()
    dependencyMocks.parseWebStream.mockResolvedValue({
      format: {codec: 'MPEG 1 Layer 3', container: 'MPEG', duration: 2},
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('track', {headers: {'Content-Length': '5', ETag: 'etag'}})),
    )

    await expect(inspectTrackUpload(OBJECT_KEY)).resolves.toMatchObject({durationMs: 2000})
  })

  it('should tolerate missing objects during deletion', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 404}))

    await expect(
      deleteTrackObject(OBJECT_KEY, {
        environment,
        fetcher,
        signRequest: async (request) => request,
      }),
    ).resolves.toBeUndefined()
  })

  it('should use default options and the global fetcher during deletion', async () => {
    stubR2Environment()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 204}))
    vi.stubGlobal('fetch', fetcher)

    await deleteTrackObject(OBJECT_KEY)

    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
