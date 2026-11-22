/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {type AdminAsset, TRACK_ASSET_STATUSES} from 'src/features/admin-music'
import {AlbumWorkspace} from '../AlbumWorkspace'
import {TrackPanel} from '../workspace/TrackPanel'
import {BASE_CATALOG, createAlbum, createModelHarness} from './fixtures/model'

vi.mock('../AlbumReleaseCard', () => ({AlbumReleaseCard: vi.fn()}))
vi.mock('../workspace/AlbumDetailsPanel', () => ({AlbumDetailsPanel: vi.fn()}))
vi.mock('../workspace/SalesPanel', () => ({SalesPanel: vi.fn()}))
vi.mock('../workspace/TrackPanel', () => ({TrackPanel: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const readAssets = () => {
  const props = vi.mocked(TrackPanel).mock.calls[0]?.[0]
  if (props === undefined) {
    throw new Error('Expected the album track panel to mount.')
  }
  return props.assets
}

it('should read track membership once per nonempty asset selection', () => {
  const readTracks = vi.fn(() => BASE_CATALOG.tracks)
  const readPending = vi.fn(() => BASE_CATALOG.pendingTracks)
  const harness = createModelHarness({
    ...BASE_CATALOG,
    get pendingTracks() {
      return readPending()
    },
    get tracks() {
      return readTracks()
    },
  })
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)
  readTracks.mockClear()
  readPending.mockClear()

  expect(readAssets()).toEqual(BASE_CATALOG.assets.slice(0, 4))
  expect(readTracks).toHaveBeenCalledTimes(1)
  expect(readPending).toHaveBeenCalledTimes(1)
  readAssets()
  expect(readTracks).toHaveBeenCalledTimes(2)
  expect(readPending).toHaveBeenCalledTimes(2)
})

it('should return fresh empty arrays without reading track membership', () => {
  const assets: AdminAsset[] = []
  const readTracks = vi.fn(() => BASE_CATALOG.tracks)
  const readPending = vi.fn(() => BASE_CATALOG.pendingTracks)
  const harness = createModelHarness({
    ...BASE_CATALOG,
    assets,
    get pendingTracks() {
      return readPending()
    },
    get tracks() {
      return readTracks()
    },
  })
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)
  readTracks.mockClear()
  readPending.mockClear()

  const first = readAssets()
  const second = readAssets()
  expect(first).toEqual([])
  expect(second).toEqual([])
  expect(first).not.toBe(second)
  expect(first).not.toBe(assets)
  expect(readTracks).not.toHaveBeenCalled()
  expect(readPending).not.toHaveBeenCalled()
})

it('should retain asset order, references, duplicates and every matching status', () => {
  const matching: AdminAsset[] = TRACK_ASSET_STATUSES.map((status) => ({
    id: status,
    status,
    trackId: status === 'active' ? 'one' : 'pending',
  }))
  const duplicate = matching[0]
  const outside: AdminAsset = {id: 'outside', status: 'active', trackId: 'other'}
  const assets = [matching[0], outside, ...matching, duplicate]
  const harness = createModelHarness({...BASE_CATALOG, assets})
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

  const selected = readAssets()
  expect(selected).toEqual([matching[0], ...matching, duplicate])
  expect(selected[0]).toBe(duplicate)
  for (const [index, asset] of matching.entries()) {
    expect(selected[index + 1]).toBe(asset)
  }
  expect(selected.at(-1)).toBe(duplicate)
  expect(selected).not.toBe(assets)
  expect(harness.model.catalog().assets).toBe(assets)
})

it('should read the current catalog after empty, pending and track updates', () => {
  const harness = createModelHarness({...BASE_CATALOG, assets: []})
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)
  expect(readAssets()).toEqual([])

  const pending: AdminAsset = {id: 'new', status: 'active', trackId: 'pending'}
  harness.setCatalog({...BASE_CATALOG, assets: [pending]})
  expect(readAssets()).toEqual([pending])
  harness.setCatalog({...BASE_CATALOG, assets: [pending], pendingTracks: []})
  expect(readAssets()).toEqual([])
  harness.setCatalog({
    ...BASE_CATALOG,
    assets: [pending],
    pendingTracks: [],
    tracks: [
      ...BASE_CATALOG.tracks,
      {albumId: 'album', artist: 'Artist', id: 'pending', position: 4, title: 'Published'},
    ],
  })
  expect(readAssets()[0]).toBe(pending)
})
