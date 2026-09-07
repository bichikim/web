import {afterEach, expect, it, vi} from 'vitest'

import {loadPAlbums, loadPublishedPAlbums} from '../focus-room-playlist'

const createJsonResponse = (value: unknown) => ({
  json: vi.fn(async () => value),
  ok: true,
  status: 200,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should preserve bundled albums when an overridden published catalog request fails', async () => {
  const album = {
    description: '기본 앨범',
    icon: 'i-tabler-music',
    id: 'included',
    title: '기본 음악',
    trackIds: [],
  }
  const publishedJson = vi.fn()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [album], version: 1}))
      .mockResolvedValue({json: publishedJson, ok: false, status: 503}),
  )

  await expect(
    loadPAlbums({publishedAlbumsUrl: 'https://pomo.test/music/albums'}),
  ).resolves.toEqual({
    bundledAlbums: [{...album, tracks: []}],
    publishedCatalog: {
      error: expect.objectContaining({
        message: 'Published focus-room albums request failed: 503',
      }),
      status: 'failed',
    },
  })
  expect(publishedJson).not.toHaveBeenCalled()
})

it('should preserve a published catalog JSON read failure', async () => {
  const jsonError = new SyntaxError('invalid published catalog JSON')
  const signal = new AbortController().signal
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.reject(jsonError),
      ok: true,
      status: 200,
    }),
  )

  await expect(
    loadPublishedPAlbums({publishedAlbumsUrl: 'https://pomo.test/music/albums', signal}),
  ).resolves.toEqual({error: jsonError, status: 'failed'})
})

it('should propagate an aborted published catalog request', async () => {
  const abortError = new DOMException('request aborted', 'AbortError')
  const controller = new AbortController()
  controller.abort(abortError)
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

  await expect(
    loadPublishedPAlbums({
      publishedAlbumsUrl: 'https://pomo.test/music/albums',
      signal: controller.signal,
    }),
  ).rejects.toBe(abortError)
})

it('should normalize a non-error published catalog rejection', async () => {
  const failure = {reason: 'network unavailable'}
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))

  const result = await loadPublishedPAlbums({
    publishedAlbumsUrl: 'https://pomo.test/music/albums',
  })

  expect(result.status).toBe('failed')

  if (result.status === 'failed') {
    expect(result.error).toMatchObject({
      cause: failure,
      message: 'Published focus-room albums request failed',
    })
  }
})
