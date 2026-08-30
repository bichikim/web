// oxlint-disable no-magic-numbers -- Binary metadata fixtures use fixed signatures and sizes.
import {AwsClient} from 'aws4fetch'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  parseWebStream: vi.fn(),
  sign: vi.fn(),
}))

vi.mock('aws4fetch', () => ({AwsClient: vi.fn()}))

vi.mock('music-metadata', () => ({parseWebStream: dependencyMocks.parseWebStream}))

import {deleteTrackObject, inspectTrackUpload, MAXIMUM_TRACK_BYTES} from '../track-upload'

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

describe('default inspection and deletion', () => {
  const stubR2Environment = () => {
    vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'account-id')
    vi.stubEnv('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID', 'access-key')
    vi.stubEnv('POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY', 'secret-key')
  }

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
