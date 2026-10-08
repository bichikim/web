/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {readEmbeddedAudioCover} from 'src/features/custom-albums/read-embedded-audio-cover'
import {useImageBitmap} from 'src/hooks/use-image-bitmap'

const metadataMocks = vi.hoisted(() => ({
  parseBlob: vi.fn(),
}))

vi.mock('music-metadata', () => metadataMocks)

vi.mock('src/features/custom-albums/crop-custom-album-image', () => ({
  cropCustomAlbumImage: vi.fn(async () => new Blob(['webp'], {type: 'image/webp'})),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should decode manual custom album cover files with EXIF orientation like admin album covers', async () => {
  const decode = vi.fn().mockResolvedValue({
    close: vi.fn(),
    height: 200,
    width: 100,
  } satisfies ImageBitmap)
  vi.stubGlobal('createImageBitmap', decode)

  const file = new File(['jpeg'], 'photo.jpg', {type: 'image/jpeg'})
  const {result} = renderHook(() => useImageBitmap(() => file))

  await vi.waitFor(() => expect(result.imageBitmap()).not.toBeNull())
  expect(decode).toHaveBeenCalledWith(file, {imageOrientation: 'from-image'})
})

it('should decode embedded track artwork with EXIF orientation before square cropping', async () => {
  const pictureData = new Uint8Array([0xff, 0xd8, 0xff, 0x00])
  metadataMocks.parseBlob.mockResolvedValue({
    common: {
      picture: [{data: pictureData, format: 'image/jpeg'}],
    },
  })

  const decode = vi.fn().mockResolvedValue({
    close: vi.fn(),
    height: 300,
    width: 400,
  } satisfies ImageBitmap)
  vi.stubGlobal('createImageBitmap', decode)

  await readEmbeddedAudioCover(new Blob(['mp3'], {type: 'audio/mpeg'}))

  expect(decode).toHaveBeenCalledOnce()
  expect(decode).toHaveBeenCalledWith(expect.objectContaining({type: 'image/jpeg'}), {
    imageOrientation: 'from-image',
  })
})
