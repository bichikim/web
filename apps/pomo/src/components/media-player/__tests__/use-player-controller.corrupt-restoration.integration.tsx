/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import {Blob as NodeBlob} from 'node:buffer'
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import * as focusRoomAudio from 'src/features/focus-room-audio'
import * as database from 'src/features/custom-albums/database'
import * as customTrackReader from 'src/features/custom-albums/read-custom-album-tracks'
import {revokeCustomTrackObjectUrls} from 'src/features/custom-albums/to-custom-p-track'
import {type PlayerController, usePlayerController} from '../use-player-controller'

vi.mock('src/features/focus-room-audio', async () => {
  const actual = await vi.importActual<typeof import('src/features/focus-room-audio')>(
    'src/features/focus-room-audio',
  )
  return {...actual, loadPTrackQueueSource: vi.fn(), usePAudioVisualizer: vi.fn()}
})
vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

const PLAYBACK_KEY = 'pomo:focus-room-playback:v1'
const VALID_A = 'custom-track:valid-a'
const VALID_B = 'custom-track:valid-b'
const CORRUPT_ID = 'custom-track:corrupt'
const BUNDLED = {
  artist: 'Artist',
  durationSeconds: 60,
  id: 'bundled-track',
  source: '/bundled.wav',
  title: 'Bundled',
} as const satisfies focusRoomAudio.PTrack
const SAVED = {
  isPlaying: true,
  positionSeconds: 22,
  queueEntryId: 'entry-b',
  trackId: VALID_B,
  trackIndex: 0,
} as const

const seedTracks = async (includeCorrupt: boolean) => {
  const connection = await database.openCustomAlbumDatabase()
  const transaction = connection.transaction(database.TRACK_STORE_NAME, 'readwrite')
  const finished = database.waitForTransaction(transaction)
  const store = transaction.objectStore(database.TRACK_STORE_NAME)
  store.clear()
  for (const id of [VALID_A, VALID_B, ...(includeCorrupt ? [CORRUPT_ID] : [])]) {
    store.put({
      albumId: 'custom-album:fixture',
      artist: 'Artist',
      audio: new Blob(['audio'], {type: 'audio/wav'}),
      durationSeconds: id === CORRUPT_ID ? -1 : 60,
      fileName: `${id}.wav`,
      id,
      title: id,
    })
  }
  await finished
  localStorage.setItem(PLAYBACK_KEY, JSON.stringify({...SAVED, savedAt: 1}))
  localStorage.setItem(
    'pomo:focus-room-playlist:v1',
    JSON.stringify({
      entryIds: ['entry-b', 'entry-corrupt', 'entry-a'],
      savedAt: 1,
      trackIds: [VALID_B, CORRUPT_ID, VALID_A],
      version: 1,
    }),
  )
}

const readPlayback = (): unknown => JSON.parse(localStorage.getItem(PLAYBACK_KEY) ?? 'null')
const mountController = () => {
  const audio = document.createElement('audio')
  vi.spyOn(audio, 'load').mockImplementation(() => undefined)
  vi.spyOn(audio, 'pause').mockImplementation(() => undefined)
  vi.spyOn(audio, 'play').mockResolvedValue()
  const onError = vi.fn()
  let controller: PlayerController | undefined
  const Harness = () => {
    controller = usePlayerController({element: () => audio, onError})
    return null
  }
  const view = render(() => <Harness />, {wrapper: PreferenceProvider})
  if (controller === undefined) {
    throw new Error('Missing player controller')
  }
  return {audio, controller, onError, unmount: view.unmount}
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:custom-track')
      static revokeObjectURL = vi.fn()
    },
  )
  vi.mocked(focusRoomAudio.loadPTrackQueueSource).mockResolvedValue({
    defaultTracks: [BUNDLED],
    tracks: [BUNDLED],
  })
  vi.mocked(focusRoomAudio.usePAudioVisualizer).mockReturnValue({
    levels: () => [],
    setOutputGain: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })
})
afterEach(async () => {
  cleanup()
  const connection = await database.openCustomAlbumDatabase()
  const transaction = connection.transaction(database.TRACK_STORE_NAME, 'readwrite')
  const finished = database.waitForTransaction(transaction)
  transaction.objectStore(database.TRACK_STORE_NAME).clear()
  await finished
  revokeCustomTrackObjectUrls(new Set([VALID_A, VALID_B]))
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should preserve saved playback before metadata and after unmount when a corrupt track is reported', async () => {
  await seedTracks(true)
  const {audio, controller, onError, unmount} = mountController()
  await waitFor(() => expect(controller.tracks().map(({id}) => id)).toEqual([VALID_B, VALID_A]))
  expect(audio.readyState).toBe(0)
  expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({code: 'corrupt-data'}))
  expect(readPlayback()).toMatchObject(SAVED)
  unmount()
  expect(readPlayback()).toMatchObject(SAVED)
})

it('should preserve the existing fatal storage failure playback handling', async () => {
  await seedTracks(false)
  const storageError = new Error('IndexedDB request failed')
  vi.spyOn(database, 'readRequest').mockRejectedValueOnce(storageError)
  const {controller, onError} = mountController()
  await waitFor(() => expect(onError).toHaveBeenCalledExactlyOnceWith(storageError))
  expect(controller.currentTrack()?.id).toBe(BUNDLED.id)
  expect(readPlayback()).toMatchObject({isPlaying: false, positionSeconds: 0, trackId: BUNDLED.id})
})

it('should preserve the existing media error playback handling', async () => {
  await seedTracks(false)
  const {controller, onError} = mountController()
  await waitFor(() => expect(controller.tracks().map(({id}) => id)).toEqual([VALID_B, VALID_A]))
  const mediaError = new Error('Media decode failed')
  controller.onError(mediaError)
  expect(onError).toHaveBeenCalledExactlyOnceWith(mediaError)
  expect(readPlayback()).toMatchObject({...SAVED, isPlaying: false})
})

it('should suppress a late corrupt record report after the player is disposed', async () => {
  await seedTracks(true)
  const release = Promise.withResolvers<void>()
  const originalRead = database.readRequest
  vi.spyOn(database, 'readRequest').mockImplementationOnce(async function holdRequest<Value>(
    request: IDBRequest<Value>,
  ) {
    const value = await originalRead(request)
    await release.promise
    return value
  })
  const reading = vi.spyOn(customTrackReader, 'readCustomAlbumTracks')
  const {onError, unmount} = mountController()
  await waitFor(() => expect(reading).toHaveBeenCalledOnce())
  const pending = reading.mock.results[0]
  if (pending?.type !== 'return') {
    throw new Error('Missing pending custom track read')
  }
  unmount()
  release.resolve()
  await pending.value
  await Promise.resolve()
  expect(onError).not.toHaveBeenCalled()
})
