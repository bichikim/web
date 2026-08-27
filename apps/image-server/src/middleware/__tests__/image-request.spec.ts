import {got} from 'got'
import type {NextFunction, Request, Response} from 'express'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {imageContext, imageRequest} from '../image-request'
import {ImageRequestError} from '../safe-image-request'

vi.mock('got', () => ({
  got: {stream: vi.fn()},
}))

const createRequest = (query: Request['query'], url = '/image'): Request =>
  ({query, url}) as unknown as Request

const emptyResponse = {} as Response

const createStream = (chunks: readonly Uint8Array[]) => {
  const iterator = chunks[Symbol.iterator]()
  const stream = {
    destroy: vi.fn(),
    [Symbol.asyncIterator]: () => ({
      next: async () => iterator.next(),
    }),
  }

  return stream
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('imageRequest', () => {
  it('should continue without downloading when no target URL is available', async () => {
    const next = vi.fn()

    await imageRequest()(createRequest({}), emptyResponse, next)

    expect(next).toHaveBeenCalledWith()
    expect(got.stream).not.toHaveBeenCalled()
  })

  it('should reject a private target before starting a download', async () => {
    const next = vi.fn()

    await imageRequest()(createRequest({url: 'http://127.0.0.1/image.png'}), emptyResponse, next)

    expect(next).toHaveBeenCalledWith(expect.any(ImageRequestError))
    expect(got.stream).not.toHaveBeenCalled()
  })

  it('should download and provide a public image buffer', async () => {
    const request = createRequest({url: 'https://images.example/photo.png'})
    const next = vi.fn()
    const stream = createStream([new Uint8Array([1, 2]), new Uint8Array([3])])
    vi.mocked(got.stream).mockReturnValue(stream as unknown as ReturnType<typeof got.stream>)

    await imageRequest()(request, emptyResponse, next)

    expect(got.stream).toHaveBeenCalledWith(
      new URL('https://images.example/photo.png'),
      expect.objectContaining({maxRedirects: 3, retry: {limit: 0}}),
    )
    expect(imageContext.use(request)).toEqual(Buffer.from([1, 2, 3]))
    expect(next).toHaveBeenCalledWith()
  })

  it('should stop a download that exceeds the byte limit', async () => {
    const next: NextFunction = vi.fn()
    const stream = createStream([new Uint8Array([1, 2]), new Uint8Array([3])])
    vi.mocked(got.stream).mockReturnValue(stream as unknown as ReturnType<typeof got.stream>)

    await imageRequest({maxImageBytes: 2})(
      createRequest({url: 'https://images.example/large.png'}),
      emptyResponse,
      next,
    )

    expect(stream.destroy).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({statusCode: 413}))
  })
})
