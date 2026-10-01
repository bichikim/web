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
  readEmbeddedAudioCover: vi.fn(
    async () => new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/jpeg'}),
  ),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

const stubAudioMetadata = (): void => {
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
        duration: 60,
        load: () => loadedMetadataListener?.(),
        preload: '',
        removeAttribute: vi.fn(),
        removeEventListener: vi.fn(),
      }
    },
  } as unknown as Document)
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.stubGlobal('crypto', {randomUUID: () => 'track-1'})
}

const createAudioFile = (size: number): File =>
  new File([new Uint8Array(size)], 'song.mp3', {type: 'audio/mpeg'})

it('should retain valid tracks and omit embedded artwork that would exceed the album limit', async () => {
  stubAudioMetadata()

  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  const {readEmbeddedAudioCover} =
    await import('src/features/custom-albums/read-embedded-audio-cover')
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [createAudioFile(mocks.albumByteLimit - 100)],
    readEmbeddedCover: true,
  })

  expect(readEmbeddedAudioCover).toHaveBeenCalledOnce()
  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error('Expected the valid track to be added.')
  }
  expect(result.tracks).toHaveLength(1)
  expect(result.embeddedCoverImage).toBeNull()
})

it('should retain embedded artwork when the persisted album is exactly at the byte limit', async () => {
  stubAudioMetadata()

  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [createAudioFile(mocks.albumByteLimit - mocks.embeddedCoverBytes)],
    readEmbeddedCover: true,
  })

  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error('Expected the track at the exact byte limit to be added.')
  }
  expect(result.embeddedCoverImage?.size).toBe(mocks.embeddedCoverBytes)
})
