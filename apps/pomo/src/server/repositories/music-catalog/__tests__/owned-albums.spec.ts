/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {listOwnedAlbums} from '..'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../../database', async () => {
  const actual = await vi.importActual<typeof import('../../../database')>('../../../database')

  return {...actual, getDatabase: databaseMocks.getDatabase}
})

const select = vi.fn()
const database = {select}

const createQuery = (result: ReadonlyArray<unknown>, joinCount: number) => {
  const terminal = {
    where: vi.fn(() => ({orderBy: vi.fn().mockResolvedValue(result)})),
  }
  const createJoinChain = (
    remaining: number,
  ): typeof terminal | {innerJoin: ReturnType<typeof vi.fn>} =>
    remaining === 0 ? terminal : {innerJoin: vi.fn(() => createJoinChain(remaining - 1))}

  return {from: vi.fn(() => createJoinChain(joinCount))}
}

beforeEach(() => {
  vi.clearAllMocks()
  select.mockReset()
  databaseMocks.getDatabase.mockReturnValue(database)
})

describe('listOwnedAlbums', () => {
  it('should return active entitlements with localized archived tracks and playback duration', async () => {
    select
      .mockReturnValueOnce(
        createQuery(
          [
            {
              coverFallback: 'lp',
              coverImageUrl: 'https://assets.example/archive.webp',
              description: '한국어 설명',
              id: 'album-1',
              locale: 'ko',
              productId: 'product-1',
              publishedAt: new Date('2026-09-10T00:00:00Z'),
              title: '한국어 제목',
            },
            {
              coverFallback: 'lp',
              coverImageUrl: 'https://assets.example/archive.webp',
              description: 'Archived description',
              id: 'album-1',
              locale: 'en',
              productId: 'product-1',
              publishedAt: new Date('2026-09-10T00:00:00Z'),
              title: 'Archived album',
            },
          ],
          3,
        ),
      )
      .mockReturnValueOnce(
        createQuery(
          [
            {
              albumId: 'album-1',
              artist: 'Artist One',
              artworkUrl: null,
              durationMs: 120000,
              id: 'track-1',
              position: 0,
              title: 'Track One',
            },
            {
              albumId: 'album-1',
              artist: 'Artist One',
              artworkUrl: null,
              durationMs: 120000,
              id: 'track-1',
              position: 0,
              title: 'Track One',
            },
            {
              albumId: 'album-1',
              artist: 'Artist Two',
              artworkUrl: 'https://assets.example/track-2.webp',
              durationMs: 90500,
              id: 'track-2',
              position: 1,
              title: 'Track Two',
            },
          ],
          5,
        ),
      )

    await expect(
      listOwnedAlbums('user-1', 'en', new Date('2026-09-20T00:00:00Z')),
    ).resolves.toEqual([
      {
        coverFallback: 'lp',
        coverImageUrl: 'https://assets.example/archive.webp',
        description: 'Archived description',
        id: 'album-1',
        productId: 'product-1',
        title: 'Archived album',
        trackCount: 2,
        tracks: [
          {
            artist: 'Artist One',
            artworkUrl: undefined,
            durationSeconds: 120,
            id: 'track-1',
            title: 'Track One',
          },
          {
            artist: 'Artist Two',
            artworkUrl: 'https://assets.example/track-2.webp',
            durationSeconds: 90.5,
            id: 'track-2',
            title: 'Track Two',
          },
        ],
      },
    ])
  })

  it('should return no albums when the entitlement query has no active rows', async () => {
    select.mockReturnValueOnce(createQuery([], 3)).mockReturnValueOnce(createQuery([], 5))

    await expect(listOwnedAlbums('user-without-access')).resolves.toEqual([])
  })

  it('should propagate a catalog read failure', async () => {
    select.mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({orderBy: vi.fn().mockRejectedValue(new Error('owned failed'))})),
            })),
          })),
        })),
      })),
    })
    select.mockReturnValueOnce(createQuery([], 5))

    await expect(listOwnedAlbums('user-1')).rejects.toThrow('owned failed')
  })
})
