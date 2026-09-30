/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  albumByteLimit: 1000,
  embeddedCoverBytes: 200,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: mocks.albumByteLimit,
  }
})

vi.mock('src/features/custom-albums/read-embedded-audio-cover', () => ({
  readEmbeddedAudioCover: vi.fn(async () => new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/jpeg'})),
}))

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
          loadedMetadataListener?.()
        },
        preload: '',
        removeAttribute: () => undefined,
        removeEventListener: () => undefined,
        src: '',
      }
    },
  })
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('should reject track imports when embedded cover bytes would exceed the album limit', async () => {
  stubAudioMetadata(60)
  vi.stubGlobal('crypto', {randomUUID: () => 'custom-track:track-1'})

  const {addCustomAlbumTracks} = await import('src/features/custom-albums/add-custom-album-tracks')
  const trackBytes = mocks.albumByteLimit - 100
  const audio = new File([new Uint8Array(trackBytes)], 'song.mp3', {type: 'audio/mpeg'})

  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [audio],
    readEmbeddedCover: true,
  })

  expect(result.kind).toBe('album-too-large')
})
