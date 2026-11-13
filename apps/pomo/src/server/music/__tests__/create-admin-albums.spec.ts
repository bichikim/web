import {describe, expect, it} from 'vitest'
import type {AdminAsset} from 'src/features/admin-music/catalog'

import {createAdminAlbums, type CreateAdminAlbumsOptions} from '../create-admin-albums'

describe('createAdminAlbums', () => {
  it('should assemble album releases and translations', () => {
    const albums = [
      {coverFallback: 'music', coverImageUrl: null, id: 'album-1', status: 'draft'},
      {coverFallback: 'lp', coverImageUrl: 'cover.webp', id: 'album-2', status: 'published'},
    ] satisfies CreateAdminAlbumsOptions['albums']
    const translations = [
      {albumId: 'album-1', description: 'One', locale: 'ko', title: 'Album One'},
      {albumId: 'other', description: 'Other', locale: 'ko', title: 'Other'},
    ] satisfies CreateAdminAlbumsOptions['translations']
    const tracks = [
      {albumId: 'album-1', artist: 'Artist', id: 'track-1', position: 0, title: 'One'},
      {albumId: 'album-1', artist: 'Artist', id: 'track-2', position: 1, title: 'Two'},
    ]
    const assets = [
      {
        artworkUrl: 'https://storage.pomofi.io/track-artwork/asset-1/cover',
        id: 'asset-1',
        status: 'active',
        trackId: 'track-1',
      },
      {id: 'asset-2', status: 'pending', trackId: 'track-2'},
    ] satisfies ReadonlyArray<AdminAsset>

    expect(createAdminAlbums({albums, assets, tracks, translations})).toEqual([
      {
        ...albums[0],
        release: {blockers: ['tracks_missing_active_asset'], ready: false},
        translations: [translations[0]],
      },
      {
        ...albums[1],
        release: {blockers: [], ready: true},
        translations: [],
      },
    ])
  })

  it('should keep album relations ordered and isolated while counting repeated track rows', () => {
    const albums = ['album-2', 'album-1', 'empty'].map(
      (id) =>
        ({
          coverFallback: 'music',
          coverImageUrl: null,
          id,
          status: 'draft',
        }) satisfies CreateAdminAlbumsOptions['albums'][number],
    )
    const translations = [
      {albumId: 'album-1', description: 'One', locale: 'en', title: 'One'},
      {albumId: 'album-2', description: 'Two', locale: 'en', title: 'Two'},
      {albumId: 'album-1', description: '하나', locale: 'ko', title: '하나'},
      {albumId: 'unlisted', description: 'Other', locale: 'ko', title: 'Other'},
      {albumId: 'album-2', description: '둘', locale: 'ko', title: '둘'},
    ] satisfies CreateAdminAlbumsOptions['translations']
    const tracks = [
      {albumId: 'album-1', artist: 'Artist', id: 'active', position: 0, title: 'Active'},
      {albumId: 'album-2', artist: 'Artist', id: 'pending', position: 0, title: 'Pending'},
      {albumId: 'album-1', artist: 'Artist', id: 'active', position: 1, title: 'Repeated'},
    ]
    const assets = [
      {id: 'asset-1', status: 'active', trackId: 'active'},
      {id: 'asset-2', status: 'pending', trackId: 'pending'},
    ] satisfies ReadonlyArray<AdminAsset>

    const result = createAdminAlbums({albums, assets, tracks, translations})

    expect(result).toEqual([
      {
        ...albums[0],
        release: {blockers: ['tracks_missing_active_asset'], ready: false},
        translations: [translations[1], translations[4]],
      },
      {
        ...albums[1],
        release: {blockers: [], ready: true},
        translations: [translations[0], translations[2]],
      },
      {...albums[2], release: {blockers: [], ready: true}, translations: []},
    ])
    expect(result[0].translations[0]).toBe(translations[1])
    expect(result[0].translations[1]).toBe(translations[4])
  })

  it('should return an empty collection for an empty snapshot', () => {
    expect(createAdminAlbums({albums: [], assets: [], tracks: [], translations: []})).toEqual([])
  })
})
