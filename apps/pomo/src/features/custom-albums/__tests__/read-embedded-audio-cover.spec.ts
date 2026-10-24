/** @vitest-environment node */
import {readFile} from 'node:fs/promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readEmbeddedAudioCover} from '../read-embedded-audio-cover'
import {MAXIMUM_CUSTOM_COVER_SOURCE_BYTES} from '../model'
import {createAudioWithPictures} from './support/embedded-cover-audio'

vi.mock('../crop-custom-album-image', () => ({
  cropCustomAlbumImage: vi.fn(async () => new Blob(['cover'], {type: 'image/webp'})),
}))
const audio = new Uint8Array(
  await readFile(new URL('../../../../public/tour/audio/ko/music-album.mp3', import.meta.url)),
)
const red = new Uint8Array(
  await readFile(
    new URL('../../../routes/api/admin/music/__tests__/fixtures/artwork/red.png', import.meta.url),
  ),
)
const blue = new Uint8Array(
  await readFile(
    new URL('../../../routes/api/admin/music/__tests__/fixtures/artwork/blue.png', import.meta.url),
  ),
)
const close = vi.fn()
const decode = vi.fn(async (_image: Blob) => ({close, height: 8, width: 8}))
beforeEach(() => {
  vi.clearAllMocks()
  decode.mockReset().mockResolvedValue({close, height: 8, width: 8})
  vi.stubGlobal('createImageBitmap', decode)
})
afterEach(() => vi.unstubAllGlobals())

it.each([
  {
    expected: red,
    name: 'front after back',
    pictures: [
      {data: blue, format: 'image/png', type: 4},
      {data: red, format: 'image/png', type: 3},
    ],
  },
  {
    expected: red,
    name: 'front before back',
    pictures: [
      {data: red, format: 'image/png', type: 3},
      {data: blue, format: 'image/png', type: 4},
    ],
  },
  {
    expected: red,
    name: 'first of multiple fronts',
    pictures: [
      {data: red, format: 'image/png', type: 3},
      {data: blue, format: 'image/png', type: 3},
    ],
  },
  {
    expected: blue,
    name: 'first picture without front',
    pictures: [
      {data: blue, format: 'image/png', type: 0},
      {data: red, format: 'image/png', type: 4},
    ],
  },
  {
    expected: red,
    name: 'eligible back before oversized front',
    pictures: [
      {data: red, format: 'image/png', type: 4},
      {data: new Uint8Array(MAXIMUM_CUSTOM_COVER_SOURCE_BYTES + 1), format: 'image/png', type: 3},
    ],
  },
])('should select $name from real MP3 metadata', async ({pictures, expected}) => {
  const cover = await readEmbeddedAudioCover(createAudioWithPictures(audio, pictures))
  expect(cover?.type).toBe('image/webp')
  expect(decode).toHaveBeenCalledOnce()
  const [image] = decode.mock.calls[0]!
  expect(new Uint8Array(await image.arrayBuffer())).toEqual(expected)
  expect(close).toHaveBeenCalledOnce()
})
it('should return null without embedded pictures', async () => {
  expect(await readEmbeddedAudioCover(createAudioWithPictures(audio, []))).toBeNull()
  expect(decode).not.toHaveBeenCalled()
})
it('should return null without native bitmap decoding', async () => {
  vi.stubGlobal('createImageBitmap', undefined)
  expect(
    await readEmbeddedAudioCover(
      createAudioWithPictures(audio, [{data: red, format: 'image/png', type: 3}]),
    ),
  ).toBeNull()
})

it('should preserve the first eligible picture when decoding the preferred front fails', async () => {
  decode.mockRejectedValueOnce(new Error('Invalid image'))
  const file = createAudioWithPictures(audio, [
    {data: blue, format: 'image/png', type: 4},
    {data: red, format: 'image/png', type: 3},
  ])
  expect((await readEmbeddedAudioCover(file))?.type).toBe('image/webp')
  expect(decode).toHaveBeenCalledTimes(2)
  expect(new Uint8Array(await decode.mock.calls[1]![0].arrayBuffer())).toEqual(blue)
  expect(close).toHaveBeenCalledOnce()
})
it('should not decode more than the preferred and original first pictures', async () => {
  decode.mockRejectedValue(new Error('Invalid image'))
  const file = createAudioWithPictures(audio, [
    {data: blue, format: 'image/png', type: 4},
    {data: red, format: 'image/png', type: 3},
    {data: blue, format: 'image/png', type: 3},
  ])
  expect(await readEmbeddedAudioCover(file)).toBeNull()
  expect(decode).toHaveBeenCalledTimes(2)
  expect(close).not.toHaveBeenCalled()
})
