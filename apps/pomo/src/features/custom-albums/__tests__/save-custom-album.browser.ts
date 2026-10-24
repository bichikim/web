import {afterEach, expect, it} from 'vitest'

import {readCustomAlbumDraft} from '../read-custom-album-draft'
import {readCustomAlbumTracks} from '../read-custom-album-tracks'
import {saveCustomAlbum} from '../save-custom-album'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'
import {clearCustomAlbumDatabase} from './support/clear-database'

const trackId = 'custom-track:replacement-diagnostic'

afterEach(async () => {
  revokeCustomTrackObjectUrls(new Set([trackId]))
  await clearCustomAlbumDatabase()
})

const checkNativeBlobStorage = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const name = `custom-album-blob-capability-${crypto.randomUUID()}`
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('blobs')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('blobs', 'readwrite')
      transaction.objectStore('blobs').put(new Blob(['audio'], {type: 'audio/mpeg'}), 'audio')
      const close = () => {
        database.close()
        indexedDB.deleteDatabase(name)
      }
      transaction.oncomplete = () => {
        close()
        resolve()
      }
      transaction.onabort = () => {
        const {error} = transaction
        close()
        reject(error)
      }
    }
  })

it('should read newly stored audio through native object URLs after replacing the same track', async ({
  skip,
}) => {
  try {
    await checkNativeBlobStorage()
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === 'UnknownError' &&
      error.message === 'Error preparing Blob/File data to be stored in object store'
    ) {
      skip('This browser context rejects a native Blob put before any album code runs.')
    }
    throw error
  }
  const track = {
    audio: new Blob(['audio-a'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: trackId,
    title: 'Same title',
  }
  const options = {
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc' as const,
    coverImage: {kind: 'keep' as const},
    coverSource: 'automatic' as const,
    title: 'Album',
  }
  const albumId = await saveCustomAlbum({...options, tracks: [track]})
  const first = await readCustomAlbumTracks({onError: () => undefined, trackIds: [trackId]})
  expect(await fetch(first[0]!.source).then((response) => response.text())).toBe('audio-a')

  await saveCustomAlbum({
    ...options,
    albumId,
    tracks: [{...track, audio: new Blob(['audio-b'], {type: 'audio/mpeg'})}],
  })
  const stored = await readCustomAlbumDraft({albumId})
  expect(await stored!.tracks[0]!.audio.text()).toBe('audio-b')
  const second = await readCustomAlbumTracks({onError: () => undefined, trackIds: [trackId]})
  const text = await fetch(second[0]!.source).then((response) => response.text())
  expect(
    text,
    JSON.stringify({
      browser: navigator.userAgent,
      playback: text,
      sameUrl: first[0]!.source === second[0]!.source,
      stored: await stored!.tracks[0]!.audio.text(),
    }),
  ).toBe('audio-b')
})
