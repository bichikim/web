/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {MediaPlayer} from '../MediaPlayer'
import {useMediaPlayer} from '../context'
import {PreferenceProvider} from 'src/hooks/use-preference'

const PLAYLIST_KEY = 'pomo:focus-room-playlist:v1'
const PLAYBACK_KEY = 'pomo:focus-room-playback:v1'
const CATALOG_TRACKS = [
  {artist: 'Artist', durationSeconds: 120, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 120, id: 'two', source: '/two.mp3', title: 'Two'},
]

vi.mock('media-chrome', () => ({}))

const stubPlaylistFetch = () => {
  const fetchMock = vi.fn()
  fetchMock
    .mockResolvedValueOnce({
      json: () => Promise.resolve({tracks: CATALOG_TRACKS, version: 1}),
      ok: true,
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({trackIds: ['one', 'two'], version: 1}),
      ok: true,
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({tracks: CATALOG_TRACKS, version: 1}),
      ok: true,
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({trackIds: ['one', 'two'], version: 1}),
      ok: true,
    })
  vi.stubGlobal('fetch', fetchMock)
}

const QueueProbe = () => {
  const player = useMediaPlayer()
  return (
    <>
      <output data-testid="queue-state">
        {`${player.currentIndex()}|${player
          .tracks()
          .map((track) => track.id)
          .join(',')}`}
      </output>
      <button onClick={() => player.reorderTrackInQueue(1, 2)}>Move active duplicate</button>
    </>
  )
}

const renderPlayer = () =>
  render(
    () => (
      <MediaPlayer>
        <QueueProbe />
      </MediaPlayer>
    ),
    {wrapper: PreferenceProvider},
  )

const readStorage = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(
    PLAYLIST_KEY,
    JSON.stringify({
      entryIds: ['one-first', 'one-second', 'two'],
      savedAt: 10,
      trackIds: ['one', 'one', 'two'],
      version: 1,
    }),
  )
  localStorage.setItem(
    PLAYBACK_KEY,
    JSON.stringify({
      isPlaying: false,
      positionSeconds: 17,
      queueEntryId: 'one-second',
      savedAt: 10,
      trackId: 'one',
      trackIndex: 1,
    }),
  )
  stubPlaylistFetch()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should save and restore the active duplicate entry after a queue reorder', async () => {
  const first = renderPlayer()

  await waitFor(() => expect(screen.getByTestId('queue-state').textContent).toBe('1|one,one,two'))
  expect(readStorage(PLAYBACK_KEY)).toMatchObject({
    queueEntryId: 'one-second',
    trackIndex: 1,
  })
  fireEvent.click(screen.getByRole('button', {name: 'Move active duplicate'}))

  await waitFor(() => {
    expect(screen.getByTestId('queue-state').textContent).toBe('2|one,two,one')
    expect(readStorage(PLAYLIST_KEY)).toMatchObject({
      entryIds: ['one-first', 'two', 'one-second'],
      trackIds: ['one', 'two', 'one'],
      version: 1,
    })
    expect(readStorage(PLAYBACK_KEY)).toMatchObject({
      positionSeconds: 17,
      queueEntryId: 'one-second',
      trackId: 'one',
      trackIndex: 2,
    })
  })
  first.unmount()

  const second = renderPlayer()
  await waitFor(() => expect(screen.getByTestId('queue-state').textContent).toBe('2|one,two,one'))
  expect(readStorage(PLAYBACK_KEY)).toMatchObject({
    queueEntryId: 'one-second',
    trackId: 'one',
    trackIndex: 2,
  })
  second.unmount()
})
