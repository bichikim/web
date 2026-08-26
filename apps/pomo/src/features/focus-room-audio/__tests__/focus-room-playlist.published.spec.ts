import {afterEach, expect, it, vi} from 'vitest'

import {loadPAlbums} from '../focus-room-playlist'

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
      .mockResolvedValueOnce({json: publishedJson, ok: false, status: 503}),
  )

  await expect(
    loadPAlbums({publishedAlbumsUrl: 'https://pomo.test/music/albums'}),
  ).resolves.toEqual([{...album, tracks: []}])
  expect(publishedJson).not.toHaveBeenCalled()
})
