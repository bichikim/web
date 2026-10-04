/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

const limitMocks = vi.hoisted(() => ({
  albumByteLimit: 800,
  libraryByteLimit: 1_000,
  trackByteLimit: 800,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: limitMocks.albumByteLimit,
    MAXIMUM_CUSTOM_LIBRARY_BYTES: limitMocks.libraryByteLimit,
    MAXIMUM_CUSTOM_TRACK_BYTES: limitMocks.trackByteLimit,
  }
})

const DATABASE_NAME = 'pomo-custom-albums'

const resetCustomAlbumStorage = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
  vi.resetModules()
}

const stubAudioMetadata = (durationSeconds: number): void => {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      if (tagName !== 'audio') {
        throw new Error(`Unexpected element: ${tagName}`)
      }

      let loadedMetadataListener: (() => void) | undefined

      return {
        addEventListener: (eventName: string, listener: () => void) => {
          if (eventName === 'loadedmetadata') {
            loadedMetadataListener = listener
          }
        },
        duration: durationSeconds,
        load: () => {
          queueMicrotask(() => loadedMetadataListener?.())
        },
        preload: '',
        removeAttribute: vi.fn(),
        removeEventListener: vi.fn(),
      }
    },
  } as unknown as Document)
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

afterEach(async () => {
  await resetCustomAlbumStorage()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should reject track additions that would exceed the combined custom-album library limit', async () => {
  stubAudioMetadata(60)
  vi.stubGlobal('crypto', {
    randomUUID: vi
      .fn()
      .mockReturnValueOnce('custom-album:album-a')
      .mockReturnValueOnce('custom-track:track-b'),
  })

  const {addCustomAlbumTracks, saveCustomAlbum} = await import('src/features/custom-albums')
  const existingTrack = {
    audio: new Blob([new Uint8Array(700)], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'existing.mp3',
    id: 'custom-track:track-a',
    title: 'Existing',
  }

  await saveCustomAlbum({
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc',
    coverImage: {kind: 'keep'},
    coverSource: 'automatic',
    title: 'Album A',
    tracks: [existingTrack],
  })

  const newFile = new File([new Uint8Array(400)], 'new.mp3', {type: 'audio/mpeg'})
  const addResult = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [newFile],
    readEmbeddedCover: false,
  })

  expect(addResult.kind).toBe('library-too-large')
})
