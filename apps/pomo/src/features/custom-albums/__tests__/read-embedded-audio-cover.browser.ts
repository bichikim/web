import {afterEach, expect, it} from 'vitest'
import {server} from 'vitest/browser'
import {parseBlob} from 'music-metadata'
import blueUrl from '../../../routes/api/admin/music/__tests__/fixtures/artwork/blue.png?url'
import redUrl from '../../../routes/api/admin/music/__tests__/fixtures/artwork/red.png?url'
import {readEmbeddedAudioCover} from '../read-embedded-audio-cover'
import {addCustomAlbumTracks} from '../add-custom-album-tracks'
import {createAudioWithPictures} from './support/embedded-cover-audio'
import {clearCustomAlbumDatabase} from './support/clear-database'

const DOMINANT_CHANNEL_MINIMUM = 200
const OTHER_CHANNEL_MAXIMUM = 40

const bytes = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer())
const readPixel = async (blob: Blob | null) => {
  expect(blob).not.toBeNull()
  const bitmap = await createImageBitmap(blob!)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    return [...context.getImageData(0, 0, 1, 1).data]
  } finally {
    bitmap.close()
  }
}
afterEach(clearCustomAlbumDatabase)
it('should select front artwork through a real MP3 import and preserve unsupported WebP fallback', async () => {
  const [audio, blue, red] = await Promise.all([
    bytes('/tour/audio/ko/music-album.mp3'),
    bytes(blueUrl),
    bytes(redUrl),
  ])
  const file = createAudioWithPictures(audio, [
    {data: blue, format: 'image/png', type: 4},
    {data: red, format: 'image/png', type: 3},
  ])
  const metadata = await parseBlob(file, {duration: true})
  expect(metadata.common.picture?.map((picture) => picture.type)).toEqual([
    'Cover (back)',
    'Cover (front)',
  ])
  expect(metadata.format.duration).toBeGreaterThan(1)
  const cover = await readEmbeddedAudioCover(file)
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [file],
    readEmbeddedCover: true,
  })
  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error(result.kind)
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const encodedType = await new Promise<string | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob?.type ?? null), 'image/webp')
  })
  console.log(
    '3359_NATIVE_CAPABILITY',
    JSON.stringify({
      consumerCover: result.embeddedCoverImage?.type ?? null,
      cover: cover?.type ?? null,
      encodedType,
      engine: server.browser,
      trackDuration: result.tracks[0]?.durationSeconds,
    }),
  )
  if (encodedType !== 'image/webp') {
    expect(cover).toBeNull()
    expect(result.embeddedCoverImage).toBeNull()
    return
  }
  const directPixel = await readPixel(cover)
  const consumerPixel = await readPixel(result.embeddedCoverImage)
  console.log(
    '3359_NATIVE_COVER',
    JSON.stringify({
      consumerPixel,
      coverType: cover?.type,
      directPixel,
      duration: metadata.format.duration,
      engine: server.browser,
      fileBytes: file.size,
      pictureTypes: metadata.common.picture?.map((picture) => picture.type),
      trackDuration: result.tracks[0]?.durationSeconds,
      userAgent: navigator.userAgent,
    }),
  )
  expect(directPixel[0]).toBeGreaterThan(DOMINANT_CHANNEL_MINIMUM)
  expect(directPixel[2]).toBeLessThan(OTHER_CHANNEL_MAXIMUM)
  expect(consumerPixel[0]).toBeGreaterThan(DOMINANT_CHANNEL_MINIMUM)
  expect(consumerPixel[2]).toBeLessThan(OTHER_CHANNEL_MAXIMUM)
})

it('should retain a usable first picture when preferred front artwork cannot be decoded', async () => {
  const [audio, blue] = await Promise.all([bytes('/tour/audio/ko/music-album.mp3'), bytes(blueUrl)])
  const file = createAudioWithPictures(audio, [
    {data: blue, format: 'image/png', type: 4},
    {data: new TextEncoder().encode('not an image'), format: 'image/png', type: 3},
  ])
  const metadata = await parseBlob(file)
  expect(metadata.common.picture?.map((picture) => picture.type)).toEqual([
    'Cover (back)',
    'Cover (front)',
  ])
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const encodedType = await new Promise<string | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob?.type ?? null), 'image/webp')
  })
  const cover = await readEmbeddedAudioCover(file)
  console.log(
    '3359_UNREADABLE_FRONT',
    JSON.stringify({cover: cover?.type ?? null, encodedType, engine: server.browser}),
  )
  if (encodedType !== 'image/webp') {
    expect(cover).toBeNull()
    return
  }
  const pixel = await readPixel(cover)
  expect(pixel[0]).toBeLessThan(OTHER_CHANNEL_MAXIMUM)
  expect(pixel[2]).toBeGreaterThan(DOMINANT_CHANNEL_MINIMUM)
})
