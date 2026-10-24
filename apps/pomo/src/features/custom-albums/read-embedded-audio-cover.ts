import {getCenteredSquareCrop} from 'src/utils/square-webp-cover'
import {cropCustomAlbumImage} from './crop-custom-album-image'
import {MAXIMUM_CUSTOM_COVER_SOURCE_BYTES} from './model'

export const readEmbeddedAudioCover = async (file: Blob): Promise<Blob | null> => {
  if (typeof globalThis.createImageBitmap !== 'function') {
    return null
  }

  try {
    const {parseBlob} = await import('music-metadata')
    const metadata = await parseBlob(file, {duration: false})
    const picture = metadata.common.picture?.find(
      ({data, format}) =>
        format.startsWith('image/') &&
        data.byteLength > 0 &&
        data.byteLength <= MAXIMUM_CUSTOM_COVER_SOURCE_BYTES,
    )

    if (picture === undefined) {
      return null
    }

    const imageBuffer = new ArrayBuffer(picture.data.byteLength)
    new Uint8Array(imageBuffer).set(picture.data)
    const image = await globalThis.createImageBitmap(
      new Blob([imageBuffer], {type: picture.format}),
    )

    try {
      if (image.width <= 0 || image.height <= 0) {
        return null
      }

      return await cropCustomAlbumImage({
        image,
        ...getCenteredSquareCrop(image.width, image.height),
      })
    } finally {
      image.close()
    }
  } catch {
    return null
  }
}
