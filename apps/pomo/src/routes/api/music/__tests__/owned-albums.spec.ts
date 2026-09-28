/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({listOwnedAlbums: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/repositories/music-catalog', () => repositoryMocks)

import {GET} from '../albums/owned'

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  repositoryMocks.listOwnedAlbums.mockResolvedValue([
    {
      coverFallback: 'lp',
      coverImageUrl: null,
      description: '내 앨범',
      id: 'album-1',
      productId: 'product-1',
      title: '보관된 앨범',
      trackCount: 1,
      tracks: [
        {
          artist: 'Artist',
          artworkUrl: undefined,
          durationSeconds: 120,
          id: 'track-1',
          title: 'Track',
        },
      ],
    },
  ])
})

describe('owned music albums route', () => {
  it('should return the authenticated owned catalog without public caching', async () => {
    const response = await GET({
      request: new Request('https://pomo.test/api/music/albums/owned?locale=en'),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      albums: [
        {
          coverFallback: 'lp',
          coverImageUrl: null,
          description: '내 앨범',
          id: 'album-1',
          productId: 'product-1',
          title: '보관된 앨범',
          trackCount: 1,
          tracks: [{artist: 'Artist', durationSeconds: 120, id: 'track-1', title: 'Track'}],
        },
      ],
      version: 1,
    })
    expect(repositoryMocks.listOwnedAlbums).toHaveBeenCalledWith('user-1', 'en')
  })

  it('should not query the private catalog for an anonymous visitor', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await GET({
      request: new Request('https://pomo.test/api/music/albums/owned'),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(repositoryMocks.listOwnedAlbums).not.toHaveBeenCalled()
  })
})
