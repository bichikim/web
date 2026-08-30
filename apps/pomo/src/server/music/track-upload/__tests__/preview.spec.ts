// oxlint-disable no-magic-numbers -- MP3 fixtures use fixed frame sizes and binary headers.
import {AwsClient} from 'aws4fetch'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({sign: vi.fn()}))

vi.mock('aws4fetch', () => ({AwsClient: vi.fn()}))

import {
  createTrackPreviewObject,
  ensureTrackPreviewObject,
  readTrackPreviewObject,
} from '../preview'

const OBJECT_KEY =
  'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3'
const environment = {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'}

beforeEach(() => {
  vi.mocked(AwsClient).mockImplementation(function createMockAwsClient() {
    return {sign: dependencyMocks.sign} as never
  })
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

describe('default preview fetch', () => {
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
})
