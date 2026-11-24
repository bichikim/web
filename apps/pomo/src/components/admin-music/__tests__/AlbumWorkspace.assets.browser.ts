import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import type {AdminTrack} from 'src/features/admin-music'
import {AlbumWorkspace} from '../AlbumWorkspace'
import {AdminTrackPreview} from '../AdminTrackPreview'
import {BASE_CATALOG, createAlbum, createModelHarness} from './fixtures/model'

vi.mock('../AdminTrackPreview', () => ({AdminTrackPreview: vi.fn()}))

beforeEach(() => {
  vi.mocked(AdminTrackPreview).mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should keep active counts, pending membership, album changes and tabs reactive', async () => {
  const harness = createModelHarness({...BASE_CATALOG, assets: []})
  const [album, setAlbum] = createSignal(createAlbum('published'))
  render(() =>
    createComponent(AlbumWorkspace, {
      get album() {
        return album()
      },
      model: harness.model,
    }),
  )
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 0'})).toBeVisible()

  harness.setCatalog(BASE_CATALOG)
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 2'})).toBeVisible()
  await expect.element(page.getByText('등록 결과 확인 필요', {exact: true})).toBeVisible()

  harness.setCatalog({
    ...BASE_CATALOG,
    assets: BASE_CATALOG.assets.map((asset) => {
      if (asset.trackId === 'two') {
        return {...asset, status: 'failed'}
      }
      return asset.trackId === 'pending' ? {...asset, status: 'active'} : asset
    }),
  })
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 1'})).toBeVisible()
  await expect.element(page.getByText('활성화 반영 확인 필요', {exact: true})).toBeVisible()
  const promoted = {
    ...harness.model.catalog(),
    pendingTracks: [],
    tracks: [
      ...BASE_CATALOG.tracks,
      {albumId: 'album', artist: 'Artist', id: 'pending', position: 4, title: 'Promoted track'},
    ],
  }
  harness.setCatalog(promoted)
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 2'})).toBeVisible()
  await expect.element(page.getByText('Promoted track', {exact: true})).toBeVisible()
  expect(screen.queryByRole('heading', {name: /등록 확인 필요/u})).not.toBeInTheDocument()
  harness.setCatalog({...promoted, tracks: promoted.tracks.filter((track) => track.id !== 'one')})
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 1'})).toBeVisible()
  expect(screen.queryByText('Track one', {exact: true})).not.toBeInTheDocument()
  await page.getByRole('button', {exact: true, name: '공개 설정'}).click()
  await expect
    .element(page.getByRole('tab', {exact: true, name: '판매 및 공개'}))
    .toHaveAttribute('aria-selected', 'true')
  await expect.element(page.getByRole('region', {name: '앨범 상태 변경 확인'})).toBeVisible()
  expect(screen.getByText('1곡', {exact: true})).toBeVisible()
  await page.getByRole('tab', {exact: true, name: '기본 정보'}).click()
  await expect.element(page.getByText('한국어 제목', {exact: true})).toBeVisible()

  setAlbum({...createAlbum('published'), id: 'other'})
  await page.getByRole('tab', {exact: true, name: '수록곡 1'}).click()
  await expect.element(page.getByText('Other', {exact: true})).toBeVisible()
  expect(screen.queryByText('Track one', {exact: true})).not.toBeInTheDocument()
})

it('should update a two-hundred-track workspace without counting duplicate assets twice', async () => {
  const tracks: AdminTrack[] = Array.from({length: 200}, (_, position) => ({
    albumId: 'album',
    artist: 'Artist',
    id: `track-${position}`,
    position,
    title: `Track ${position}`,
  }))
  const assets = tracks.flatMap((track) => [
    {id: `active-${track.id}`, status: 'active' as const, trackId: track.id},
    {id: `pending-${track.id}`, status: 'pending' as const, trackId: track.id},
  ])
  const catalog = {...BASE_CATALOG, assets, pendingTracks: [], tracks}
  const harness = createModelHarness(catalog)
  render(() => createComponent(AlbumWorkspace, {album: createAlbum(), model: harness.model}))
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 200'})).toBeVisible()
  expect(screen.getAllByRole('button', {name: /수록곡 삭제$/u})).toHaveLength(tracks.length)

  harness.setCatalog({
    ...catalog,
    assets: assets.map((asset) =>
      asset.id === 'active-track-0' ? {...asset, status: 'failed'} : asset,
    ),
  })
  await expect.element(page.getByRole('heading', {exact: true, name: '수록곡 199'})).toBeVisible()
  expect(screen.queryByRole('button', {name: 'Track 0 수록곡 삭제'})).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', {name: /수록곡 삭제$/u})).toHaveLength(tracks.length - 1)
})
