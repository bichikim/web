import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readCustomAlbumTracks} from '../read-custom-album-tracks'
import {readCustomAlbums} from '../read-custom-albums'
import {saveCustomAlbum} from '../save-custom-album'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'
import {clearCustomAlbumDatabase} from './support/clear-database'

const id = 'custom-track:retained-queue'
const options = {
  albumId: null,
  artist: 'Artist',
  coverIcon: 'disc' as const,
  coverImage: {kind: 'keep' as const},
  coverSource: 'automatic' as const,
  title: 'Album',
}
const track = (audio: Blob) => ({
  audio,
  durationSeconds: 10,
  fileName: 'native.mp3',
  id,
  title: 'Song',
})
beforeEach(async ({skip}) => {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(`native-blob-baseline-${crypto.randomUUID()}`, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('blob')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('blob', 'readwrite')
        const finish = () => {
          database.close()
          indexedDB.deleteDatabase(database.name)
        }
        transaction.onabort = () => {
          const {error} = transaction
          finish()
          reject(error)
        }
        transaction.oncomplete = () => {
          finish()
          resolve()
        }
        transaction.objectStore('blob').put(new Blob(['baseline']), 'one')
      }
    })
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === 'UnknownError' &&
      error.message === 'Error preparing Blob/File data to be stored in object store'
    ) {
      skip(`Native baseline before product: ${error.name}: ${error.message}`)
    }
    throw error
  }
})

afterEach(async () => {
  vi.restoreAllMocks()
  revokeCustomTrackObjectUrls(new Set([id]))
  await clearCustomAlbumDatabase()
})

it('should preserve successful identical-byte validation when an older library retry fails later', async () => {
  const audio = new Blob(['same bytes'], {type: 'audio/mpeg'})
  const albumId = await saveCustomAlbum({...options, tracks: [track(audio)]})
  let cachedAudio: Blob | undefined
  const nativeCreate = URL.createObjectURL.bind(URL)
  const capture = vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
    if (value instanceof Blob) {
      cachedAudio = value
    }
    return nativeCreate(value)
  })
  const first = await readCustomAlbumTracks({onError: vi.fn(), trackIds: [id]})
  capture.mockRestore()
  const cached = cachedAudio!
  const initial = vi.spyOn(cached, 'slice').mockImplementationOnce(() => {
    throw new Error('Initial comparison I/O failure')
  })
  await saveCustomAlbum({...options, albumId, tracks: [track(audio)]})
  initial.mockRestore()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const slice = cached.slice.bind(cached)
  vi.spyOn(cached, 'slice').mockImplementationOnce((...args) => {
    const part = slice(...args)
    vi.spyOn(part, 'arrayBuffer').mockImplementation(async () => {
      entered.resolve()
      await release.promise
      throw new Error('Late older retry I/O failure')
    })
    return part
  })
  const older = readCustomAlbums()
  const observed = older.then(
    () => 'resolved',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  )
  await entered.promise
  const newer = await readCustomAlbums()
  expect(newer[0]!.tracks[0]!.source).toBe(first[0]!.source)
  release.resolve()
  const olderOutcome = await observed
  const usableBytes = await fetch(first[0]!.source).then((r) => r.text())
  const recovered = await readCustomAlbums()
  expect(olderOutcome).toBe('resolved')
  const olderAlbums = await older
  expect(olderAlbums).toHaveLength(1)
  expect(olderAlbums[0]!.tracks[0]!.source).toBe(first[0]!.source)
  expect(usableBytes).toBe('same bytes')
  expect(recovered).toHaveLength(1)
})

it('should return an album when a successful retry finishes after a failed peer', async () => {
  const audio = new Blob(['same bytes'], {type: 'audio/mpeg'})
  const albumId = await saveCustomAlbum({...options, tracks: [track(audio)]})
  let cachedAudio: Blob | undefined
  const nativeCreate = URL.createObjectURL.bind(URL)
  const capture = vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
    if (value instanceof Blob) {
      cachedAudio = value
    }
    return nativeCreate(value)
  })
  const first = await readCustomAlbumTracks({onError: vi.fn(), trackIds: [id]})
  capture.mockRestore()
  const cached = cachedAudio!
  const initial = vi.spyOn(cached, 'slice').mockImplementationOnce(() => {
    throw new Error('Initial comparison I/O failure')
  })
  await saveCustomAlbum({...options, albumId, tracks: [track(audio)]})
  initial.mockRestore()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const slice = cached.slice.bind(cached)
  const spy = vi.spyOn(cached, 'slice').mockImplementationOnce((...args) => {
    const part = slice(...args)
    const read = part.arrayBuffer.bind(part)
    vi.spyOn(part, 'arrayBuffer').mockImplementation(async () => {
      entered.resolve()
      await release.promise
      return read()
    })
    return part
  })
  const healthy = readCustomAlbums()
  const observed = healthy.then(
    () => 'resolved',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  )
  await entered.promise
  spy.mockImplementationOnce(() => {
    throw new Error('Peer retry I/O failure')
  })
  await expect(readCustomAlbums()).rejects.toThrow('Peer retry I/O failure')
  release.resolve()
  expect(await observed).toBe('resolved')
  const albums = await healthy
  expect(albums).toHaveLength(1)
  expect(albums[0]!.tracks[0]!.source).toBe(first[0]!.source)
  expect(await fetch(first[0]!.source).then((response) => response.text())).toBe('same bytes')
})
