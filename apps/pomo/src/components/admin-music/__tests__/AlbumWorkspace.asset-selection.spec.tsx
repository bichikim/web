/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal, For} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {AdminAsset, AdminCatalog} from 'src/features/admin-music'
import {TRACK_ASSET_STATUSES} from 'src/features/admin-music/catalog-values'
import {AlbumWorkspace} from '../AlbumWorkspace'
import {TrackPanel} from '../workspace/TrackPanel'
import {BASE_CATALOG, createAlbum, createModelHarness} from './fixtures/model'

const panel = {readAssets: vi.fn<() => ReadonlyArray<AdminAsset>>()}

vi.mock('../workspace/TrackPanel', () => ({
  TrackPanel: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(TrackPanel).mockImplementation((props) => {
    panel.readAssets.mockImplementation(() => props.assets)
    return (
      <ol aria-label="앨범 자산">
        <For each={props.assets}>{(asset) => <li>{asset.id}</li>}</For>
      </ol>
    )
  })
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should preserve asset order, references and every status for registered and pending tracks', () => {
  const pendingAssets = TRACK_ASSET_STATUSES.map((status) => ({
    id: `pending-${status}`,
    status,
    trackId: 'pending',
  }))
  const assets = [
    BASE_CATALOG.assets[4],
    pendingAssets[0],
    BASE_CATALOG.assets[1],
    ...pendingAssets.slice(1),
    BASE_CATALOG.assets[0],
  ]
  const catalog: AdminCatalog = {
    ...BASE_CATALOG,
    assets,
    tracks: [...BASE_CATALOG.tracks, BASE_CATALOG.tracks[1]],
  }
  const originalAssets = [...assets]
  const harness = createModelHarness(catalog)
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

  const expected = assets.slice(1)
  const selected = panel.readAssets()
  expect(selected).toEqual(expected)
  for (const [index, asset] of expected.entries()) {
    expect(selected[index]).toBe(asset)
  }
  expect(assets).toEqual(originalAssets)
  expect(
    within(screen.getByRole('list', {name: '앨범 자산'})).getAllByRole('listitem'),
  ).toHaveLength(expected.length)
  expect(screen.getByRole('tab', {name: '수록곡 3'})).toHaveAttribute('aria-selected', 'true')
})

it('should update the selected album in the same mounted workspace without replacing its tab', () => {
  const harness = createModelHarness()
  const [album, setAlbum] = createSignal(createAlbum())
  render(() => <AlbumWorkspace album={album()} model={harness.model} />)
  const tracksTab = screen.getByRole('tab', {name: '수록곡 2'})

  setAlbum({...createAlbum(), id: 'other'})

  expect(panel.readAssets()).toEqual([BASE_CATALOG.assets[4]])
  expect(panel.readAssets()[0]).toBe(BASE_CATALOG.assets[4])
  expect(screen.getByRole('tab', {name: '수록곡 1'})).toBe(tracksTab)
  expect(tracksTab).toHaveAttribute('aria-selected', 'true')
  expect(
    within(screen.getByRole('list', {name: '앨범 자산'})).getByRole('listitem'),
  ).toHaveTextContent('asset-other')

  setAlbum({...createAlbum(), id: 'missing'})

  expect(panel.readAssets()).toEqual([])
  expect(screen.getByRole('tab', {name: '수록곡 0'})).toBe(tracksTab)
})

it('should recompute membership when catalog tracks and pending registrations change', () => {
  const pendingAsset: AdminAsset = {id: 'new-asset', status: 'failed', trackId: 'new-pending'}
  const catalog: AdminCatalog = {...BASE_CATALOG, assets: [...BASE_CATALOG.assets, pendingAsset]}
  const harness = createModelHarness(catalog)
  render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

  expect(panel.readAssets()).not.toContain(pendingAsset)

  harness.setCatalog({
    ...catalog,
    pendingTracks: [
      ...catalog.pendingTracks,
      {albumId: 'album', artist: 'New artist', id: 'new-pending', title: 'New pending'},
    ],
    tracks: catalog.tracks.filter((track) => track.id !== 'one'),
  })

  expect(panel.readAssets()).toEqual([
    BASE_CATALOG.assets[0],
    BASE_CATALOG.assets[2],
    BASE_CATALOG.assets[3],
    pendingAsset,
  ])
  expect(screen.getByRole('tab', {name: '수록곡 1'})).toHaveAttribute('aria-selected', 'true')

  harness.setCatalog({...catalog, pendingTracks: []})

  expect(panel.readAssets()).toEqual(BASE_CATALOG.assets.slice(0, 3))
  expect(screen.getByRole('tab', {name: '수록곡 2'})).toHaveAttribute('aria-selected', 'true')
})

it('should avoid reading track membership when the asset selection is empty', () => {
  let trackReads = 0
  let pendingReads = 0
  let albumReads = 0
  const catalog: AdminCatalog = {
    ...BASE_CATALOG,
    assets: [],
    get pendingTracks() {
      pendingReads += 1
      return BASE_CATALOG.pendingTracks
    },
    get tracks() {
      trackReads += 1
      return BASE_CATALOG.tracks
    },
  }
  const album = {
    ...createAlbum(),
    get id() {
      albumReads += 1
      return 'album'
    },
  }
  const harness = createModelHarness(catalog)
  render(() => <AlbumWorkspace album={album} model={harness.model} />)
  trackReads = 0
  pendingReads = 0
  albumReads = 0

  const first = panel.readAssets()
  const second = panel.readAssets()

  expect(first).toEqual([])
  expect(second).toEqual([])
  expect(first).not.toBe(second)
  expect(trackReads).toBe(0)
  expect(pendingReads).toBe(0)
  expect(albumReads).toBe(0)
})
