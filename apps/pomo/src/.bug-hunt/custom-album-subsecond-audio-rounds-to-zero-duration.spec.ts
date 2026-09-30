/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {addCustomAlbumTracks} from '../features/custom-albums/add-custom-album-tracks'
import {saveCustomAlbum} from '../features/custom-albums'

const stubShortAudioMetadata = (durationSeconds: number) => {
  vi.stubGlobal(
    'document',
    {
      createElement: (tagName: string) => {
        if (tagName !== 'audio') {
          throw new Error(`Unexpected element: ${tagName}`)
        }

        let loadedMetadataListener: (() => void) | undefined

        return {
          addEventListener: (
            eventName: string,
            listener: () => void,
            _options?: {once?: boolean},
          ) => {
            if (eventName === 'loadedmetadata') {
              loadedMetadataListener = listener
            }
          },
          load: () => {
            queueMicrotask(() => loadedMetadataListener?.())
          },
          preload: '',
          removeAttribute: vi.fn(),
          removeEventListener: vi.fn(),
          get duration() {
            return durationSeconds
          },
          set src(_value: string) {},
        }
      },
    } as unknown as Document,
  )
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:audio'),
    revokeObjectURL: vi.fn(),
  })
}

it('should reject sub-half-second audio instead of rounding duration to zero', async () => {
  stubShortAudioMetadata(0.3)

  const file = new File([new Uint8Array(32)], 'blip.mp3', {type: 'audio/mpeg'})
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [file],
    readEmbeddedCover: false,
  })

  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    return
  }

  expect(result.tracks[0]?.durationSeconds).toBeGreaterThan(0)

  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  await expect(
    saveCustomAlbum({
      albumId: null,
      artist: 'Artist',
      coverIcon: 'disc',
      coverImage: {kind: 'keep'},
      coverSource: 'automatic',
      title: 'Album',
      tracks: result.tracks,
    }),
  ).resolves.toMatch(/^custom-album:/u)
})
