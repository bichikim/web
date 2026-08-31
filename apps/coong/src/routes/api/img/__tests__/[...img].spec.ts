import type {APIEvent} from '@solidjs/start/server'
import type {IPXStorage} from 'ipx'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => {
  const handler = vi.fn()
  const imageProcessor = {process: vi.fn()}

  return {
    createIPX: vi.fn(() => imageProcessor),
    createIPXWebServer: vi.fn(() => handler),
    getSelfUrl: vi.fn(() => 'https://coong.example'),
    handler,
    imageProcessor,
  }
})

vi.mock('ipx', () => ({
  createIPX: mocks.createIPX,
  createIPXWebServer: mocks.createIPXWebServer,
}))
vi.mock('src/env', () => ({getSelfUrl: mocks.getSelfUrl}))

import {GET} from '../[...img]'

const [{storage}] = mocks.createIPX.mock.calls[0] as unknown as [{storage: IPXStorage}]
const deeplyEncodedEscape = Array.from({length: 10}, () => '').reduce(
  (value) => encodeURIComponent(value),
  '../api/img/_/loop.png',
)
const encodedEscapeAtLimit = Array.from({length: 8}, () => '').reduce(
  (value) => encodeURIComponent(value),
  '../api/img/_/loop.png',
)

describe('Coong image API', () => {
  beforeEach(() => {
    mocks.handler.mockReset()
    vi.unstubAllGlobals()
  })

  it('should initialize the production handler when the route module loads', () => {
    expect(mocks.getSelfUrl).toHaveBeenCalledOnce()
    expect(mocks.createIPX).toHaveBeenCalledWith({storage})
    expect(mocks.createIPXWebServer).toHaveBeenCalledWith(mocks.imageProcessor)
  })

  it('should fetch image data and metadata through production storage', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(bytes))
      .mockResolvedValueOnce(
        new Response(null, {
          headers: {
            'cache-control': 'public, max-age=900',
            'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
          },
        }),
      )
    vi.stubGlobal('fetch', fetcher)

    await expect(storage.getData('avatar.png')).resolves.toEqual(bytes)
    await expect(storage.getMeta('avatar.png')).resolves.toEqual({
      maxAge: 900,
      mtime: new Date('Wed, 21 Oct 2015 07:28:00 GMT'),
    })
    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://coong.example/images/avatar.png')
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://coong.example/images/avatar.png', {
      method: 'HEAD',
    })
    expect(storage.name).toBe('ipx:self')
  })

  it('should use default cache metadata when upstream headers omit it', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null)))

    await expect(storage.getMeta('avatar.png')).resolves.toEqual({
      maxAge: 300,
      mtime: undefined,
    })
  })

  it.each([404, 410])('should treat upstream status %i as a missing image', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('missing', {status})),
    )

    await expect(storage.getData('missing.png')).resolves.toBeUndefined()
    await expect(storage.getMeta('missing.png')).resolves.toBeUndefined()
  })

  it('should preserve upstream failures without parsing their bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response('unavailable', {status: 503, statusText: 'Unavailable'}),
        )
        .mockResolvedValueOnce(new Response('forbidden', {status: 403})),
    )

    await expect(storage.getData('unavailable.png')).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Unavailable',
    })
    await expect(storage.getMeta('forbidden.png')).rejects.toMatchObject({statusCode: 403})
  })

  it.each([
    '/%2e%2e/api/img/_/loop.png',
    '/%2E%2E/private.png',
    '/%252e%252e%252fapi%252fimg%252f_%252floop.png',
    '/%2e%2e/api/img/_/%252e%252e/api/img/_/%25252e%25252e/api/img/_/missing.png',
    `/${encodedEscapeAtLimit}`,
    `/${deeplyEncodedEscape}`,
    '/%E0%A4%A.png',
  ])('should reject an image path outside self storage', async (id) => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    await expect(storage.getData(id)).resolves.toBeUndefined()
    await expect(storage.getMeta(id)).resolves.toBeUndefined()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should remove the route prefix while preserving the request contract', async () => {
    const response = new Response('image')
    mocks.handler.mockResolvedValue(response)
    const event = {
      request: new Request('https://coong.example/api/img/w_320/images/avatar.png?format=webp', {
        headers: {
          Accept: 'image/avif,image/webp',
          'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
          'If-None-Match': 'avatar-etag',
        },
      }),
    } as APIEvent

    await expect(GET(event)).resolves.toBe(response)
    expect(mocks.handler).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://coong.example/w_320/images/avatar.png?format=webp'}),
    )
    const [request] = mocks.handler.mock.calls[0] as [Request]
    expect(request.headers.get('Accept')).toBe('image/avif,image/webp')
    expect(request.headers.get('If-Modified-Since')).toBe('Wed, 21 Oct 2015 07:28:00 GMT')
    expect(request.headers.get('If-None-Match')).toBe('avatar-etag')
  })

  it('should map the route root to the image handler root', async () => {
    mocks.handler.mockResolvedValue(new Response('image'))

    await GET({request: new Request('https://coong.example/api/img')} as APIEvent)

    expect(mocks.handler).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://coong.example/'}),
    )
  })
})
