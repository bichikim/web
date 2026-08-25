/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PAlbumTrackList} from '../album-library/TrackList'

afterEach(cleanup)

it('should use full sources for playable tracks and access resolution for catalog tracks', () => {
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
