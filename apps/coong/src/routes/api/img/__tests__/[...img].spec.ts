import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  createIPX: vi.fn(),
  createIPXWebServer: vi.fn(),
  getSelfUrl: vi.fn(),
}))

vi.mock('ipx', () => ({
  createIPX: mocks.createIPX,
  createIPXWebServer: mocks.createIPXWebServer,
}))
vi.mock('src/env', () => ({getSelfUrl: mocks.getSelfUrl}))

import {
  createImageHandler,
  createImageRequest,
  createLazyImageHandler,
  createSelfStorage,
  GET,
  parseResponse,
} from '../[...img]'

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
    vi.clearAllMocks()
  })

  it('should not initialize IPX while importing the route', async () => {
    vi.resetModules()

    await import('../[...img]')

    expect(mocks.createIPX).not.toHaveBeenCalled()
    expect(mocks.getSelfUrl).not.toHaveBeenCalled()
  })

  it('should parse cache metadata from response headers', () => {
    const response = new Response(null, {
      headers: {
        'cache-control': 'public, max-age=900',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      },
    })

    expect(parseResponse(response)).toEqual({
      maxAge: 900,
      mtime: new Date('Wed, 21 Oct 2015 07:28:00 GMT'),
    })
  })

  it('should use configured cache metadata defaults', () => {
    const response = new Response(null, {headers: {'cache-control': 'no-cache'}})

    expect(parseResponse(new Response(null))).toEqual({maxAge: 300, mtime: undefined})
    expect(parseResponse(response, {defaultMaxAge: 60})).toEqual({maxAge: 60, mtime: undefined})
    expect(parseResponse(response, {defaultMaxAge: 120, ignoreCacheControl: true})).toEqual({
      maxAge: 120,
      mtime: undefined,
    })
  })

  it('should fetch image data and metadata from self storage', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(bytes))
      .mockResolvedValueOnce(new Response(null, {headers: {'cache-control': 'max-age=30'}}))
    const storage = createSelfStorage({selfUrl: 'https://coong.example'}, fetcher)

    await expect(storage.getData('avatar.png')).resolves.toEqual(bytes)
    await expect(storage.getMeta('avatar.png')).resolves.toEqual({maxAge: 30, mtime: undefined})
    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://coong.example/images/avatar.png')
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://coong.example/images/avatar.png', {
      method: 'HEAD',
    })
    expect(storage.name).toBe('ipx:self')
  })

  it('should support a custom self-storage path', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ArrayBuffer(0)))
    const storage = createSelfStorage(
      {path: 'public/images', selfUrl: 'https://coong.example'},
      fetcher,
    )

    await storage.getData('cover.webp')

    expect(fetcher).toHaveBeenCalledWith('https://coong.example/public/images/cover.webp')
  })

  it.each([404, 410])('should treat upstream status %i as a missing image', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('missing', {status}))
    const storage = createSelfStorage({selfUrl: 'https://coong.example'}, fetcher)

    await expect(storage.getData('missing.png')).resolves.toBeUndefined()
    await expect(storage.getMeta('missing.png')).resolves.toBeUndefined()
  })

  it('should preserve upstream failures without parsing their bodies', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('unavailable', {status: 503, statusText: 'Unavailable'}))
      .mockResolvedValueOnce(new Response('forbidden', {status: 403}))
    const storage = createSelfStorage({selfUrl: 'https://coong.example'}, fetcher)

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
    const storage = createSelfStorage({selfUrl: 'https://coong.example'}, fetcher)

    await expect(storage.getData(id)).resolves.toBeUndefined()
    await expect(storage.getMeta(id)).resolves.toBeUndefined()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should create an IPX web handler with self storage', () => {
    const webHandler = vi.fn()
    const ipx = {process: vi.fn()}
    const fetcher = vi.fn<typeof fetch>()
    mocks.createIPX.mockReturnValue(ipx)
    mocks.createIPXWebServer.mockReturnValue(webHandler)

    expect(createImageHandler({selfUrl: 'https://coong.example'}, fetcher)).toBe(webHandler)
    expect(mocks.createIPX).toHaveBeenCalledWith({
      storage: expect.objectContaining({name: 'ipx:self'}),
    })
    expect(mocks.createIPXWebServer).toHaveBeenCalledWith(ipx)
  })

  it('should remove the route prefix while preserving the request contract', () => {
    const request = createImageRequest(
      new Request('https://coong.example/api/img/w_320/images/avatar.png?format=webp', {
        headers: {
          Accept: 'image/avif,image/webp',
          'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
          'If-None-Match': 'avatar-etag',
        },
      }),
    )

    expect(request.url).toBe('https://coong.example/w_320/images/avatar.png?format=webp')
    expect(request.headers.get('Accept')).toBe('image/avif,image/webp')
    expect(request.headers.get('If-Modified-Since')).toBe('Wed, 21 Oct 2015 07:28:00 GMT')
    expect(request.headers.get('If-None-Match')).toBe('avatar-etag')
    expect(createImageRequest(new Request('https://coong.example/api/img')).url).toBe(
      'https://coong.example/',
    )
  })

  it('should create the image handler only for the first request', async () => {
    const response = new Response('image')
    const handler = vi.fn().mockResolvedValue(response)
    const createHandler = vi.fn().mockReturnValue(handler)
    const lazyHandler = createLazyImageHandler(createHandler)
    const request = new Request('https://coong.example/image.png')

    await expect(lazyHandler(request)).resolves.toBe(response)
    await expect(lazyHandler(request)).resolves.toBe(response)
    expect(createHandler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('should lazily initialize and invoke the production route handler', async () => {
    const response = new Response('image')
    const handler = vi.fn().mockResolvedValue(response)
    const ipx = {process: vi.fn()}
    mocks.getSelfUrl.mockReturnValue('https://coong.example')
    mocks.createIPX.mockReturnValue(ipx)
    mocks.createIPXWebServer.mockReturnValue(handler)
    const event = {
      request: new Request('https://coong.example/api/img/w_320/images/avatar.png'),
    } as APIEvent

    await expect(GET(event)).resolves.toBe(response)
    expect(mocks.getSelfUrl).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://coong.example/w_320/images/avatar.png'}),
    )
  })
})
