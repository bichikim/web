// oxlint-disable no-magic-numbers -- MP3 fixtures use fixed frame sizes and binary headers.
import {describe, expect, it, vi} from 'vitest'

import {
  createTrackPlayback,
  createTrackPreviewObject,
  createTrackUpload,
  deleteTrackObject,
  inspectTrackUpload,
} from '../track-upload'

const OBJECT_KEY =
  'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3'
const environment = {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'}
const PREVIEW_INPUT_END = 2_097_151

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
