import {beforeEach, describe, expect, it, vi} from 'vitest'

const artworkMocks = vi.hoisted(() => ({deleteTrackArtwork: vi.fn()}))
const uploadMocks = vi.hoisted(() => ({deleteTrackObject: vi.fn()}))

vi.mock('../cover-upload', () => artworkMocks)
vi.mock('../track-upload', () => uploadMocks)

import {deleteTrackAssetStorage} from '../track-storage-deletion'

const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const OBJECT_KEY = `tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/${ASSET_ID}/source.mp3` as const

describe('deleteTrackAssetStorage', () => {
  beforeEach(() => {
    artworkMocks.deleteTrackArtwork.mockReset().mockResolvedValue(undefined)
    uploadMocks.deleteTrackObject.mockReset().mockResolvedValue(undefined)
  })

  it('should delete the audio, previews, and extracted artwork for an asset', async () => {
    await deleteTrackAssetStorage(OBJECT_KEY)

    expect(uploadMocks.deleteTrackObject).toHaveBeenCalledExactlyOnceWith(OBJECT_KEY)
    expect(artworkMocks.deleteTrackArtwork).toHaveBeenCalledExactlyOnceWith(ASSET_ID)
  })

  it('should reject an invalid key before deleting any storage objects', async () => {
    await expect(deleteTrackAssetStorage('invalid')).rejects.toThrow('invalid_track_object_key')
    expect(uploadMocks.deleteTrackObject).not.toHaveBeenCalled()
    expect(artworkMocks.deleteTrackArtwork).not.toHaveBeenCalled()
  })
})
