import {createSignal} from 'solid-js'
import type {AdminAsset, AdminTrack} from 'src/features/admin-music'
/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {BASE_CATALOG, createModelHarness} from '../../__tests__/fixtures/model'
import {TrackPanel} from '../TrackPanel'
vi.mock('@solidjs/start', () => ({
  clientOnly: vi.fn(() => (props: {title: string}) => <audio aria-label={props.title} />),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should count active tracks and require confirmation before removal', async () => {
  const {model} = createModelHarness()
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      model={model}
      albumStatus="published"
      assets={BASE_CATALOG.assets}
      pendingTracks={[]}
      tracks={BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')}
    />
  ))
  expect(screen.getByRole('heading', {name: '수록곡 2'})).toBeVisible()
  expect(screen.queryByText('Hidden track')).not.toBeInTheDocument()
  const button = screen.getByRole('button', {name: 'Track one 수록곡 삭제'})
  fireEvent.click(button)
  expect(model.handleTrackRemove).not.toHaveBeenCalled()
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('현재 공개 중인 앨범'))
  confirm.mockReturnValue(true)
  fireEvent.click(button)
  await waitFor(() => expect(model.handleTrackRemove).toHaveBeenCalledWith('one'))
})

it('should show each active track artwork without using an inactive asset image', () => {
  const {model} = createModelHarness()
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      albumStatus="draft"
      model={model}
      pendingTracks={[]}
      tracks={BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')}
      assets={[
        {
          artworkUrl: 'https://images.example/old.png',

          id: 'old',
          status: 'retired',
          trackId: 'one',
        },
        {
          artworkUrl: 'https://images.example/one.png',

          id: 'first',
          status: 'active',
          trackId: 'one',
        },
        {
          artworkUrl: 'https://images.example/two.png',

          id: 'second',
          status: 'active',
          trackId: 'two',
        },
      ]}
    />
  ))
  expect(screen.getByRole('img', {name: 'Track one 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/one.png',
  )
  expect(screen.getByRole('img', {name: 'Track two 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/two.png',
  )
  expect(screen.getAllByRole('img')).toHaveLength(2)
})

it('should preserve preview playback position when refreshed catalog objects replace tracks', () => {
  const {model} = createModelHarness()
  const initial = BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')
  const [tracks, setTracks] = createSignal<ReadonlyArray<AdminTrack>>(initial)
  const result = render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      albumStatus="draft"
      model={model}
      assets={BASE_CATALOG.assets}
      pendingTracks={[]}
      tracks={tracks()}
    />
  ))
  const audio = result.container.querySelector<HTMLAudioElement>('audio[aria-label="Track one"]')!
  audio.currentTime = 12
  setTracks(
    initial.map((track) => ({...track, title: track.id === 'one' ? 'Updated title' : track.title})),
  )
  const updated = result.container.querySelector<HTMLAudioElement>(
    'audio[aria-label="Updated title"]',
  )
  expect(updated).toBe(audio)
  expect(updated?.currentTime).toBe(12)
  setTracks((current) => current.filter((track) => track.id !== 'one'))
  expect(audio.isConnected).toBe(false)
})

it.each([null, undefined])(
  'should retain the first active artwork even when it is %s',
  (artworkUrl) => {
    const {model} = createModelHarness()
    render(() => (
      <TrackPanel
        albumId="album"
        albumTitle="앨범"
        albumStatus="draft"
        model={model}
        pendingTracks={[]}
        tracks={BASE_CATALOG.tracks.filter((track) => track.id === 'one')}
        assets={[
          {artworkUrl, id: 'first', status: 'active', trackId: 'one'},
          {
            artworkUrl: 'https://images.example/later.png',
            id: 'later',
            status: 'active',
            trackId: 'one',
          },
          {id: 'orphan', status: 'active', trackId: 'missing'},
        ]}
      />
    ))

    expect(screen.getByRole('heading', {name: '수록곡 1'})).toBeVisible()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  },
)

it('should refresh membership and the first artwork when assets change', () => {
  const {model} = createModelHarness()
  const [assets, setAssets] = createSignal<ReadonlyArray<AdminAsset>>([
    {artworkUrl: 'https://images.example/first.png', id: 'first', status: 'active', trackId: 'one'},
    {artworkUrl: 'https://images.example/later.png', id: 'later', status: 'active', trackId: 'one'},
    {id: 'two', status: 'pending', trackId: 'two'},
  ])
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      albumStatus="draft"
      model={model}
      pendingTracks={[]}
      tracks={BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')}
      assets={assets()}
    />
  ))
  expect(screen.getByRole('heading', {name: '수록곡 1'})).toBeVisible()
  expect(screen.getByRole('img', {name: 'Track one 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/first.png',
  )

  setAssets((current) =>
    current.map((asset) => ({
      ...asset,
      status: asset.id === 'first' ? 'retired' : 'active',
    })),
  )
  expect(screen.getByRole('heading', {name: '수록곡 2'})).toBeVisible()
  expect(screen.getByRole('img', {name: 'Track one 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/later.png',
  )
  expect(screen.getByRole('button', {name: 'Track two 수록곡 삭제'})).toBeVisible()

  setAssets([])
  expect(screen.getByRole('heading', {name: '수록곡 0'})).toBeVisible()
  expect(screen.queryByRole('button', {name: 'Track one 수록곡 삭제'})).not.toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '첫 곡 추가'})).toBeVisible()
})

it('should preserve tied track order and frozen inputs while reacting to track positions', () => {
  const {model} = createModelHarness()
  const initial = Object.freeze(
    BASE_CATALOG.tracks
      .filter((track) => track.albumId === 'album')
      .map((track) => Object.freeze({...track, position: 1})),
  )
  const assets = Object.freeze(BASE_CATALOG.assets.map((asset) => Object.freeze({...asset})))
  const [tracks, setTracks] = createSignal<ReadonlyArray<AdminTrack>>(initial)
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      albumStatus="draft"
      model={model}
      pendingTracks={[]}
      tracks={tracks()}
      assets={assets}
    />
  ))
  expect(
    screen
      .getAllByRole('button', {name: /수록곡 삭제/u})
      .map((button) => button.getAttribute('aria-label')),
  ).toEqual(['Track two 수록곡 삭제', 'Track one 수록곡 삭제'])

  setTracks(initial.map((track) => ({...track, position: track.id === 'one' ? 0 : 1})))
  expect(
    screen
      .getAllByRole('button', {name: /수록곡 삭제/u})
      .map((button) => button.getAttribute('aria-label')),
  ).toEqual(['Track one 수록곡 삭제', 'Track two 수록곡 삭제'])
  expect(initial.map((track) => [track.id, track.position])).toEqual([
    ['two', 1],
    ['one', 1],
    ['hidden', 1],
  ])
  expect(assets).toEqual(BASE_CATALOG.assets)
})
