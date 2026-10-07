import {expect, it} from 'vitest'

import type {AdminAsset, AdminTrack} from '../catalog'
import {getCatalogTrackCounts} from '../catalog-track-counts'

const track = (id: string, albumId = 'album'): AdminTrack => ({
  albumId,
  artist: '',
  id,
  position: 0,
  title: '',
})
const asset = (trackId: string, status: AdminAsset['status'] = 'active'): AdminAsset => ({
  id: `asset-${trackId}`,
  status,
  trackId,
})

it('counts active assets rather than tracks, ignoring orphan assets and inactive statuses', () => {
  const counts = getCatalogTrackCounts({
    assets: [
      asset('one'),
      asset('one'),
      asset('two'),
      ...(['pending', 'uploaded', 'ready', 'failed', 'retired', 'deleted'] as const).map((status) =>
        asset('two', status),
      ),
      asset('orphan'),
    ],
    tracks: [track('one'), track('two'), track('without-assets', 'empty')],
  })

  expect([...counts]).toEqual([
    ['album', 3],
    ['empty', 0],
  ])
  expect(counts.has('missing')).toBe(false)
})

it('counts duplicate track IDs once within each album and preserves membership across albums', () => {
  expect([
    ...getCatalogTrackCounts({
      assets: [asset('shared'), asset('shared')],
      tracks: [track('shared', 'first'), track('shared', 'first'), track('shared', 'second')],
    }),
  ]).toEqual([
    ['first', 2],
    ['second', 2],
  ])
})

it('handles arbitrary string identifiers and empty snapshots without changing input arrays', () => {
  const tracks = Object.freeze([track('__proto__', 'constructor'), track('toString', '__proto__')])
  const assets = Object.freeze([asset('__proto__'), asset('toString')])
  expect([...getCatalogTrackCounts({assets, tracks})]).toEqual([
    ['constructor', 1],
    ['__proto__', 1],
  ])
  expect(getCatalogTrackCounts({assets: [], tracks: []}).size).toBe(0)
})
