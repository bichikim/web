import {beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({listPublishedAlbums: vi.fn()}))

vi.mock('src/server/music/catalog-repository', () => repositoryMocks)

import {GET} from '../albums'

describe('published music albums route', () => {
  beforeEach(() => {
    repositoryMocks.listPublishedAlbums.mockReset().mockResolvedValue([
      {
        coverFallback: 'lp',
        coverImageUrl: null,
        description: '곧 판매할 앨범',
        id: 'album-id',
        sale: {state: 'preparing'},
        title: '첫 앨범',
        trackCount: 2,
        tracks: [
          {artist: '첫 가수', id: 'track-one', title: '첫 곡'},
          {artist: '둘째 가수', id: 'track-two', title: '둘째 곡'},
        ],
      },
    ])
  })

  it('should expose published albums without requiring a configured product', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      albums: [
        {
          coverFallback: 'lp',
          coverImageUrl: null,
          description: '곧 판매할 앨범',
          id: 'album-id',
          sale: {state: 'preparing'},
          title: '첫 앨범',
          trackCount: 2,
          tracks: [
            {artist: '첫 가수', id: 'track-one', title: '첫 곡'},
            {artist: '둘째 가수', id: 'track-two', title: '둘째 곡'},
          ],
        },
      ],
      version: 1,
    })
  })

  it('should not cache a catalog failure', async () => {
    repositoryMocks.listPublishedAlbums.mockRejectedValue(new Error('database unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET()

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
