/** @vitest-environment node */
import {expect, it} from 'vitest'
import {type AlbumTranslation, createPublishedAlbums} from '../create-published-albums'

const translation = (id: string, locale: 'en' | 'ko', title: string): AlbumTranslation => ({
  coverFallback: 'music',
  coverImageUrl: null,
  description: title,
  id,
  locale,
  title,
})

it('should return an empty catalog when no translations were returned', () => {
  expect(
    createPublishedAlbums({albumTracks: [], albumTranslations: [], locale: 'ko', offers: []}),
  ).toEqual([])
})

it('should preserve first album order, last preferred translation and first fallback', () => {
  const albumTranslations = [
    translation('__proto__', 'en', 'First English'),
    translation('fallback', 'ko', 'First fallback'),
    translation('__proto__', 'ko', 'Ignored Korean'),
    translation('fallback', 'ko', 'Ignored fallback'),
    translation('__proto__', 'en', 'Last English'),
  ]
  const original = structuredClone(albumTranslations)

  const albums = createPublishedAlbums({
    albumTracks: [],
    albumTranslations,
    locale: 'en',
    offers: [],
  })

  expect(albums).toEqual([
    {
      coverFallback: 'music',
      coverImageUrl: null,
      description: 'Last English',
      id: '__proto__',
      sale: {state: 'preparing'},
      title: 'Last English',
      trackCount: 0,
      tracks: [],
    },
    {
      coverFallback: 'music',
      coverImageUrl: null,
      description: 'First fallback',
      id: 'fallback',
      sale: {state: 'preparing'},
      title: 'First fallback',
      trackCount: 0,
      tracks: [],
    },
  ])
  expect(albumTranslations).toEqual(original)
})

it('should retain ordered duplicate tracks and normalize only nullish artwork', () => {
  const albumTracks = [
    {albumId: 'album', artist: 'Artist', artworkUrl: null, id: 'same', title: 'First asset'},
    {albumId: 'orphan', artist: 'Other', artworkUrl: null, id: 'orphan', title: 'Orphan'},
    {albumId: 'album', artist: 'Artist', artworkUrl: '', id: 'same', title: 'Second asset'},
    {
      albumId: 'album',
      artist: 'Artist',
      artworkUrl: 'https://assets.example/cover.webp',
      id: 'third',
      title: 'Third asset',
    },
  ]
  const original = structuredClone(albumTracks)
  const albums = createPublishedAlbums({
    albumTracks,
    albumTranslations: [translation('album', 'ko', 'Album'), translation('empty', 'ko', 'Empty')],
    locale: 'ko',
    offers: [],
  })

  expect(albums[0].tracks).toEqual([
    {artist: 'Artist', artworkUrl: undefined, id: 'same', title: 'First asset'},
    {artist: 'Artist', artworkUrl: '', id: 'same', title: 'Second asset'},
    {
      artist: 'Artist',
      artworkUrl: 'https://assets.example/cover.webp',
      id: 'third',
      title: 'Third asset',
    },
  ])
  expect(albums[0].tracks[0]).not.toBe(albumTracks[0])
  expect(albums[0].trackCount).toBe(3)
  expect(albums[1].tracks).toEqual([])
  expect(albums[1].trackCount).toBe(0)
  expect(albumTracks).toEqual(original)
})

it('should use the last offer, retain empty product ids and leave missing offers preparing', () => {
  const offers = [
    {albumId: '__proto__', externalProductId: 'first'},
    {albumId: '__proto__', externalProductId: 'last'},
    {albumId: 'empty-product', externalProductId: ''},
    {albumId: 'orphan', externalProductId: 'unused'},
  ]
  const original = structuredClone(offers)
  const albums = createPublishedAlbums({
    albumTracks: [],
    albumTranslations: [
      translation('__proto__', 'ko', 'Configured'),
      translation('empty-product', 'ko', 'Empty product'),
      translation('preparing', 'ko', 'Preparing'),
    ],
    locale: 'ko',
    offers,
  })

  expect(albums.map((album) => album.sale)).toEqual([
    {externalProductId: 'last', state: 'configured'},
    {externalProductId: '', state: 'configured'},
    {state: 'preparing'},
  ])
  expect(offers).toEqual(original)
})

it('should preserve cover values from the chosen translation', () => {
  const albums = createPublishedAlbums({
    albumTracks: [],
    albumTranslations: [
      {...translation('album', 'ko', 'Korean'), coverFallback: 'cd'},
      {
        ...translation('album', 'en', 'English'),
        coverFallback: 'lp',
        coverImageUrl: 'https://assets.example/album.webp',
      },
    ],
    locale: 'en',
    offers: [],
  })

  expect(albums[0].coverFallback).toBe('lp')
  expect(albums[0].coverImageUrl).toBe('https://assets.example/album.webp')
})

it('should propagate the original snapshot getter failure', () => {
  const expected = new Error('offer is unreadable')
  const offer = {
    albumId: 'album',
    get externalProductId(): never {
      throw expected
    },
  }
  let failure: unknown

  try {
    createPublishedAlbums({
      albumTracks: [],
      albumTranslations: [translation('album', 'ko', 'Album')],
      locale: 'ko',
      offers: [offer],
    })
  } catch (error: unknown) {
    failure = error
  }

  expect(failure).toBe(expected)
})
