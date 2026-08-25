/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createRoot, createSignal, onMount} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const audioMocks = vi.hoisted(() => ({loadTrackPreviewSource: vi.fn()}))

vi.mock('../../features/focus-room-audio', () => audioMocks)
vi.mock('solid-js', async () => {
  const actual: typeof import('solid-js') = await vi.importActual('solid-js')

  return {...actual, onMount: vi.fn(actual.onMount)}
})

import {PAlbumTrackList} from '../album-library/TrackList'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

beforeEach(() => {
  TestResizeObserver.instances.length = 0
  audioMocks.loadTrackPreviewSource.mockResolvedValue({ok: true, source: '/audio/preview.mp3'})
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should use full sources for playable tracks and access resolution for catalog tracks', async () => {
  const onPreview = vi.fn()
  const playableTrack = {
    artist: 'Artist',
    durationSeconds: 180,
    id: 'playable-track',
    source: '/audio/playable.mp3',
    title: 'Playable Track',
  }

  render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={onPreview}
      pendingTrackId={null}
      playableTracks={[playableTrack]}
      playingTrackId={null}
      trackIds={new Set()}
      tracks={[playableTrack, {artist: 'Artist', id: 'unowned-track', title: 'Unowned Track'}]}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: 'Playable Track 미리듣기'}))
  fireEvent.click(screen.getByRole('button', {name: 'Unowned Track 30초 미리듣기'}))

  expect(onPreview).toHaveBeenNthCalledWith(1, {
    id: 'playable-track',
    source: '/audio/playable.mp3',
  })
  expect(onPreview).toHaveBeenNthCalledWith(2, {
    id: 'unowned-track',
    loadSource: expect.any(Function),
  })

  const limitedPreviewRequest = onPreview.mock.calls[1]?.[0]
  if (
    limitedPreviewRequest === undefined ||
    !('loadSource' in limitedPreviewRequest) ||
    typeof limitedPreviewRequest.loadSource !== 'function'
  ) {
    throw new TypeError('Expected the catalog track to provide a preview source loader')
  }

  await limitedPreviewRequest.loadSource()
  expect(audioMocks.loadTrackPreviewSource).toHaveBeenCalledWith('unowned-track')
})

it('should visibly identify a limited preview only while it is playing', () => {
  const [playingTrackId, setPlayingTrackId] = createSignal<string | null>(null)
  const playableTrack = {
    artist: 'Artist',
    durationSeconds: 180,
    id: 'playable-track',
    source: '/audio/playable.mp3',
    title: 'Playable Track',
  }

  render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={vi.fn()}
      pendingTrackId={null}
      playableTracks={[playableTrack]}
      playingTrackId={playingTrackId()}
      trackIds={new Set()}
      tracks={[playableTrack, {artist: 'Artist', id: 'limited-track', title: 'Limited Track'}]}
    />
  ))

  expect(screen.queryByText('30초 미리듣기')).toBeNull()

  setPlayingTrackId('limited-track')
  expect(screen.getByText('30초 미리듣기').getAttribute('data-pomo-tag')).toBe('')

  setPlayingTrackId('playable-track')
  expect(screen.queryByText('30초 미리듣기')).toBeNull()
})

it('should indicate that more tracks remain below until the list reaches the bottom', () => {
  const tracks = Array.from({length: 6}, (_, index) => ({
    artist: 'Artist',
    id: `track-${index}`,
    title: `Track ${index + 1}`,
  }))
  const result = render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={vi.fn()}
      pendingTrackId={null}
      playableTracks={[]}
      playingTrackId={null}
      trackIds={new Set()}
      tracks={tracks}
    />
  ))
  const list = screen.getByRole('list', {name: 'Album 수록곡'})
  let scrollTop = 0

  expect(list.classList.contains('overscroll-auto')).toBe(true)
  expect(list.classList.contains('overscroll-contain')).toBe(false)

  Object.defineProperties(list, {
    clientHeight: {configurable: true, value: 84},
    scrollHeight: {configurable: true, value: 126},
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value
      },
    },
  })

  fireEvent.scroll(list)
  expect(result.container.querySelector('.i-tabler-chevron-down')).toBeTruthy()

  list.scrollTop = 42
  fireEvent.scroll(list)
  expect(result.container.querySelector('.i-tabler-chevron-down')).toBeNull()
})

it('should show loading state, add available tracks, and disable tracks already in the player', () => {
  const onAddTrack = vi.fn()
  const playableTrack = {
    artist: 'Artist',
    durationSeconds: 180,
    id: 'playable-track',
    source: '/audio/playable.mp3',
    title: 'Playable Track',
  }
  const firstView = render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={onAddTrack}
      onPreview={vi.fn()}
      pendingTrackId="playable-track"
      playableTracks={[playableTrack]}
      playingTrackId={null}
      trackIds={new Set()}
      tracks={[playableTrack]}
    />
  ))

  expect(firstView.container.querySelector('.i-tabler-loader-2')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button')[1]!)
  expect(onAddTrack).toHaveBeenCalledWith(playableTrack)
  firstView.unmount()

  render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={onAddTrack}
      onPreview={vi.fn()}
      pendingTrackId={null}
      playableTracks={[playableTrack]}
      playingTrackId={null}
      trackIds={new Set([playableTrack.id])}
      tracks={[playableTrack]}
    />
  ))

  const addButton = screen.getAllByRole('button')[1]
  expect(addButton?.hasAttribute('disabled')).toBe(true)
  fireEvent.click(addButton!)
  expect(onAddTrack).toHaveBeenCalledOnce()
})

it('should hide the limited preview marker while its preview is pending', () => {
  const limitedTrack = {artist: 'Artist', id: 'limited-track', title: 'Limited Track'}
  const result = render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={vi.fn()}
      pendingTrackId="limited-track"
      playableTracks={[]}
      playingTrackId="limited-track"
      trackIds={new Set()}
      tracks={[limitedTrack]}
    />
  ))

  expect(result.container.querySelector('.i-tabler-loader-2')).toBeTruthy()
  expect(screen.queryByText('30초 미리듣기')).toBeNull()
})

it('should update overflow through ResizeObserver and disconnect it during cleanup', () => {
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  const tracks = Array.from({length: 6}, (_, index) => ({
    artist: 'Artist',
    id: `track-${index}`,
    title: `Track ${index + 1}`,
  }))
  const view = render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={vi.fn()}
      pendingTrackId={null}
      playableTracks={[]}
      playingTrackId={null}
      trackIds={new Set()}
      tracks={tracks}
    />
  ))
  const list = screen.getByRole('list', {name: 'Album 수록곡'})
  Object.defineProperties(list, {
    clientHeight: {configurable: true, value: 84},
    scrollHeight: {configurable: true, value: 126},
  })
  const observer = TestResizeObserver.instances[0]

  expect(observer?.observe).toHaveBeenCalledWith(list)
  observer?.trigger()
  expect(view.container.querySelector('.i-tabler-chevron-down')).toBeTruthy()

  view.unmount()
  expect(observer?.disconnect).toHaveBeenCalledOnce()
})

it('should update overflow from window resize when ResizeObserver is unavailable', () => {
  vi.stubGlobal('ResizeObserver', undefined)
  const addEventListener = vi.spyOn(window, 'addEventListener')
  const removeEventListener = vi.spyOn(window, 'removeEventListener')
  const view = render(() => (
    <PAlbumTrackList
      albumTitle="Album"
      onAddTrack={vi.fn()}
      onPreview={vi.fn()}
      pendingTrackId={null}
      playableTracks={[]}
      playingTrackId={null}
      trackIds={new Set()}
      tracks={[{artist: 'Artist', id: 'limited-track', title: 'Limited Track'}]}
    />
  ))
  const list = screen.getByRole('list', {name: 'Album 수록곡'})
  Object.defineProperties(list, {
    clientHeight: {configurable: true, value: 84},
    scrollHeight: {configurable: true, value: 126},
  })

  window.dispatchEvent(new Event('resize'))
  expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  expect(view.container.querySelector('.i-tabler-chevron-down')).toBeTruthy()

  view.unmount()
  expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
})

it('should return from mount when its list ref is unavailable', () => {
  vi.mocked(onMount).mockImplementationOnce((callback) => callback())

  createRoot((dispose) => {
    PAlbumTrackList({
      albumTitle: 'Album',
      onAddTrack: vi.fn(),
      onPreview: vi.fn(),
      pendingTrackId: null,
      playableTracks: [],
      playingTrackId: null,
      trackIds: new Set(),
      tracks: [],
    })
    dispose()
  })

  expect(onMount).toHaveBeenCalledOnce()
})
