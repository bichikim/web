import {createSquareWebpCanvas} from 'src/utils/square-webp-cover/create-square-webp-canvas'
vi.mock('src/utils/square-webp-cover/create-square-webp-canvas', () => ({
  createSquareWebpCanvas: vi.fn(),
}))
/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {cropCustomAlbumImage} from '../crop-custom-album-image'
import {CUSTOM_ALBUM_COVER_EDGE, MAXIMUM_CUSTOM_COVER_BYTES} from '../model'
const image = {height: 480, width: 640} as ImageBitmap
const source = {image, sourceSize: 480, sourceX: 80, sourceY: 0}
afterEach(() => vi.restoreAllMocks())
const mockCanvas = (blobs: Array<Blob | null>) => {
  const drawImage = vi.fn()
  const getContext = vi.fn(() => ({drawImage}))
  const toBlob = vi.fn<HTMLCanvasElement['toBlob']>((callback) => callback(blobs.shift() ?? null))
  vi.mocked(createSquareWebpCanvas).mockReturnValue({getContext, height: 0, toBlob, width: 0})
  return {drawImage, getContext, toBlob}
}
it('should clamp an out-of-bounds crop while retaining the custom cover edge and opaque canvas', async () => {
  const blob = new Blob(['webp'], {type: 'image/webp'})
  const canvas = mockCanvas([blob])
  await expect(cropCustomAlbumImage({...source, sourceX: 999, sourceY: -20})).resolves.toBe(blob)
  expect(canvas.drawImage).toHaveBeenCalledWith(
    image,
    160,
    0,
    480,
    480,
    0,
    0,
    CUSTOM_ALBUM_COVER_EDGE,
    CUSTOM_ALBUM_COVER_EDGE,
  )
  expect(canvas.getContext).toHaveBeenCalledWith('2d', {alpha: false})
  expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82)
})
it('should retry oversized WebP output at reduced quality without drawing the crop again', async () => {
  const oversized = new Blob([new Uint8Array(MAXIMUM_CUSTOM_COVER_BYTES + 1)], {type: 'image/webp'})
  const compressed = new Blob(['small'], {type: 'image/webp'})
  const canvas = mockCanvas([oversized, compressed])
  await expect(cropCustomAlbumImage(source)).resolves.toBe(compressed)
  expect(canvas.drawImage).toHaveBeenCalledOnce()
  expect(canvas.toBlob.mock.calls.map((call) => call[2])).toEqual([0.82, 0.56])
})
it.each([null, new Blob(['png'], {type: 'image/png'})])(
  'should retain the invalid-cover error kind for unsupported encoding',
  async (blob) => {
    mockCanvas([blob])
    await expect(cropCustomAlbumImage(source)).rejects.toMatchObject({code: 'invalid-cover'})
  },
)

it('should preserve the invalid-cover contract when no drawing context is available', async () => {
  const toBlob = vi.fn()
  vi.mocked(createSquareWebpCanvas).mockReturnValue({
    getContext: () => null,
    height: 0,
    toBlob,
    width: 0,
  })
  await expect(cropCustomAlbumImage(source)).rejects.toMatchObject({code: 'invalid-cover'})
  expect(toBlob).not.toHaveBeenCalled()
})
