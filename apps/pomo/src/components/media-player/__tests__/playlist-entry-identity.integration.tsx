/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {MediaPlayer} from '../MediaPlayer'
import {useMediaPlayer} from '../context'
import {PreferenceProvider} from 'src/hooks/use-preference'

const PLAYLIST_KEY = 'pomo:focus-room-playlist:v1'
const PLAYBACK_KEY = 'pomo:focus-room-playback:v1'
type DeferredPlaylistResponse = {json: () => Promise<unknown>; ok: boolean}
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

const createDeferredResponse = () => {
  const {promise, resolve} = Promise.withResolvers<DeferredPlaylistResponse>()
  return {promise, resolve}
}

const stubDeferredPlaylistFetch = () => {
  const tracksResponse = createDeferredResponse()
  const playlistResponse = createDeferredResponse()
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(() => tracksResponse.promise)
    .mockImplementationOnce(() => playlistResponse.promise)
  vi.stubGlobal('fetch', fetchMock)
  return {fetchMock, playlistResponse, tracksResponse}
}

const markMetadataReady = (audio: HTMLAudioElement) => {
  Object.defineProperty(audio, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_METADATA,
  })
  fireEvent.loadedMetadata(audio)
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
      <button
        onClick={() => {
          player.addTracksToQueue([CATALOG_TRACKS[0]!])
          player.selectChosenTrack(0)
        }}
      >
        Add and select before catalog load
      </button>
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
  const firstAudio = first.container.querySelector('audio')!
  markMetadataReady(firstAudio)
  expect(firstAudio.currentTime).toBe(17)
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
  expect(firstAudio.currentTime).toBe(17)
  first.unmount()

  const second = renderPlayer()
  await waitFor(() => expect(screen.getByTestId('queue-state').textContent).toBe('2|one,two,one'))
  const secondAudio = second.container.querySelector('audio')!
  markMetadataReady(secondAudio)
  expect(secondAudio.currentTime).toBe(17)
  expect(readStorage(PLAYBACK_KEY)).toMatchObject({
    positionSeconds: 17,
    queueEntryId: 'one-second',
    trackId: 'one',
    trackIndex: 2,
  })
  second.unmount()
})

it('should retain a newly added entry ID when the asynchronous catalog also contains its track', async () => {
  localStorage.clear()
  const {fetchMock, playlistResponse, tracksResponse} = stubDeferredPlaylistFetch()
  const view = renderPlayer()

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button', {name: 'Add and select before catalog load'}))
  await waitFor(() =>
    expect(readStorage(PLAYBACK_KEY)).toMatchObject({
      queueEntryId: expect.stringMatching(/^entry:/u),
      trackId: 'one',
      trackIndex: 0,
    }),
  )
  const queueEntryId = readStorage(PLAYBACK_KEY).queueEntryId as string

  tracksResponse.resolve({
    json: () => Promise.resolve({tracks: CATALOG_TRACKS, version: 1}),
    ok: true,
  })
  playlistResponse.resolve({
    json: () => Promise.resolve({trackIds: ['one', 'two'], version: 1}),
    ok: true,
  })

  await waitFor(() => expect(screen.getByTestId('queue-state').textContent).toBe('0|one,two'))
  expect(readStorage(PLAYLIST_KEY)).toMatchObject({
    entryIds: [queueEntryId, expect.stringMatching(/^legacy:/u)],
    trackIds: ['one', 'two'],
  })
  expect(readStorage(PLAYBACK_KEY)).toMatchObject({
    queueEntryId,
    trackId: 'one',
    trackIndex: 0,
  })
  view.unmount()
})
