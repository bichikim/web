/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({readStoredAppSession: vi.fn()}))

vi.mock('../../user-auth/app-session', () => sessionMocks)

import {loadOwnedPAlbums} from '../focus-room-playlist/owned-catalog'

const createJsonResponse = (value: unknown) => ({
  json: () => Promise.resolve(value),
  ok: true,
  status: 200,
})

beforeEach(() => {
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('loadOwnedPAlbums', () => {
  it('should resolve an authenticated owned album to entitled track sources', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        albums: [
          {
            coverFallback: 'cd',
            coverImageUrl: null,
            description: 'Owned description',
            id: 'album-1',
            productId: 'product-1',
            title: 'Owned album',
            trackCount: 1,
            tracks: [{artist: 'Artist', durationSeconds: 120, id: 'track-1', title: 'Track'}],
          },
        ],
        version: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadOwnedPAlbums({locale: 'en'})).resolves.toEqual([
      {
        coverImageUrl: undefined,
        description: 'Owned description',
        icon: 'i-tabler-disc',
        id: 'album-1',
        owned: true,
        productId: 'product-1',
        title: 'Owned album',
        trackCount: 1,
        trackIds: ['track-1'],
        trackListings: [{artist: 'Artist', id: 'track-1', title: 'Track'}],
        tracks: [
          {
            artist: 'Artist',
            durationSeconds: 120,
            id: 'track-1',
            source: {kind: 'entitled', trackId: 'track-1'},
            title: 'Track',
          },
        ],
      },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/music/albums/owned?locale=en',
      expect.objectContaining({cache: 'no-store', credentials: 'include', signal: undefined}),
    )
  })

  it('should resolve an anonymous response to an empty catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({json: () => Promise.resolve(null), ok: false, status: 401}),
    )

    await expect(loadOwnedPAlbums()).resolves.toEqual([])
  })

  it('should reject unavailable or malformed private catalogs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({json: () => Promise.resolve(null), ok: false, status: 503}),
    )
    await expect(loadOwnedPAlbums()).rejects.toThrow('Owned focus-room albums request failed: 503')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({albums: [], version: 2})))
    await expect(loadOwnedPAlbums()).rejects.toThrow(
      'Owned focus-room albums have an invalid format',
    )
  })
})
