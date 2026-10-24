/** @vitest-environment node */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import {readCustomAlbumTracks} from '../read-custom-album-tracks'
import {saveCustomAlbum} from '../save-custom-album'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'
import * as trackCache from '../to-custom-p-track'
import {openCustomAlbumDatabase, TRACK_STORE_NAME, waitForTransaction} from '../database'
import {clearCustomAlbumDatabase} from './support/clear-database'

const ids = ['custom-track:reader-a', 'custom-track:reader-b']
const blob = (value: string) => new Blob([value], {type: 'audio/mpeg'})
const track = (value: string, id = ids[0]!) => ({
  audio: blob(value),
  durationSeconds: 1,
  fileName: 'song.mp3',
  id,
  title: 'Song',
})
const album = {
  artist: 'Artist',
  coverIcon: 'disc' as const,
  coverImage: {kind: 'keep' as const},
  coverSource: 'automatic' as const,
  title: 'Album',
}
const read = (trackIds: readonly string[]) =>
  readCustomAlbumTracks({onError: () => undefined, trackIds})
const text = (url: string) => fetch(url).then((response) => response.text())

afterEach(async () => {
  vi.restoreAllMocks()
  revokeCustomTrackObjectUrls(new Set(ids))
  await clearCustomAlbumDatabase()
})

const startDelayedFailedRead = async (includeColdTrack: boolean) => {
  const tracks = [track('audio-a'), ...(includeColdTrack ? [track('other-a', ids[1])] : [])]
  const albumId = await saveCustomAlbum({...album, albumId: null, tracks})
  const create = vi.spyOn(URL, 'createObjectURL')
  await read([ids[0]!])
  const cachedAudio = create.mock.calls[0]![0] as Blob
  create.mockRestore()
  vi.spyOn(cachedAudio, 'slice').mockImplementationOnce(() => {
    throw new Error('Read failed')
  })
  await saveCustomAlbum({...album, albumId, tracks: [track('audio-b'), ...tracks.slice(1)]})
  vi.restoreAllMocks()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const slice = cachedAudio.slice.bind(cachedAudio)
  vi.spyOn(cachedAudio, 'slice').mockImplementationOnce(
    (...args) =>
      ({
        arrayBuffer: async () => {
          entered.resolve()
          await release.promise
          return slice(...args).arrayBuffer()
        },
      }) as Blob,
  )
  const pending = read(includeColdTrack ? ids : [ids[0]!])
  await entered.promise
  return {albumId, pending, release: () => release.resolve()}
}

it('should reread storage when a retry snapshot is invalidated by cache removal and a cold replacement', async () => {
  const {albumId, pending, release} = await startDelayedFailedRead(false)
  revokeCustomTrackObjectUrls(new Set([ids[0]!]))
  await saveCustomAlbum({...album, albumId, tracks: [track('audio-c')]})
  release()
  const result = await pending
  expect(await text(result[0]!.source)).toBe('audio-c')
  expect(await text((await read([ids[0]!]))[0]!.source)).toBe('audio-c')
})

it('should reread a cold second track when another track delayed the original reader snapshot', async () => {
  const {albumId, pending, release} = await startDelayedFailedRead(true)
  await saveCustomAlbum({...album, albumId, tracks: [track('audio-b'), track('other-b', ids[1])]})
  release()
  const result = await pending
  expect(await text(result[1]!.source)).toBe('other-b')
  expect(await text((await read([ids[1]!]))[0]!.source)).toBe('other-b')
})

it('should stop after two snapshots and reject when concurrent cache changes keep invalidating a read', async () => {
  await saveCustomAlbum({...album, albumId: null, tracks: [track('audio-a')]})
  const database = await openCustomAlbumDatabase()
  const transaction = vi.spyOn(database, 'transaction')
  const retry = trackCache.retryCustomTrackObjectUrls
  vi.spyOn(trackCache, 'retryCustomTrackObjectUrls').mockImplementation(async (tracks) => {
    const generation = await retry(tracks)
    revokeCustomTrackObjectUrls(new Set(['custom-track:unrelated']))
    return generation
  })
  await expect(read([ids[0]!])).rejects.toThrow('Custom album storage changed')
  expect(transaction.mock.calls.filter(([, mode]) => mode === 'readonly')).toHaveLength(2)
})

it('should report a corrupt track once after a single invalidated snapshot is reread', async () => {
  await saveCustomAlbum({...album, albumId: null, tracks: [track('audio-a')]})
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readwrite')
  const finished = waitForTransaction(transaction)
  transaction.objectStore(TRACK_STORE_NAME).put({...track('invalid'), audio: 'invalid', id: ids[1]})
  await finished
  const retry = trackCache.retryCustomTrackObjectUrls
  vi.spyOn(trackCache, 'retryCustomTrackObjectUrls').mockImplementationOnce(async (tracks) => {
    const generation = await retry(tracks)
    revokeCustomTrackObjectUrls(new Set(['custom-track:unrelated']))
    return generation
  })
  const onError = vi.fn()
  const result = await readCustomAlbumTracks({onError, trackIds: ids})
  expect(result.map((track) => track.id)).toEqual([ids[0]])
  expect(onError).toHaveBeenCalledTimes(1)
  expect(onError.mock.calls[0]![1]).toBe(ids[1])
})
