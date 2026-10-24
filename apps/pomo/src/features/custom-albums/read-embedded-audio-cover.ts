import type {IPicture} from 'music-metadata'
import {getCenteredSquareCrop} from 'src/utils/square-webp-cover'
import {cropCustomAlbumImage} from './crop-custom-album-image'
import {MAXIMUM_CUSTOM_COVER_SOURCE_BYTES} from './model'

const readPictureCover = async (picture: IPicture): Promise<Blob | null> => {
  try {
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

export const readEmbeddedAudioCover = async (file: Blob): Promise<Blob | null> => {
  if (typeof globalThis.createImageBitmap !== 'function') {
    return null
  }

  try {
    const {parseBlob} = await import('music-metadata')
    const metadata = await parseBlob(file, {duration: false})
    const pictures = metadata.common.picture?.filter(
      ({data, format}) =>
        format.startsWith('image/') &&
        data.byteLength > 0 &&
        data.byteLength <= MAXIMUM_CUSTOM_COVER_SOURCE_BYTES,
    )
    const firstPicture = pictures?.[0]
    if (firstPicture === undefined) {
      return null
    }
    const preferredPicture =
      pictures?.find(({type}) => type?.toLowerCase().includes('front') === true) ?? firstPicture
    const preferredCover = await readPictureCover(preferredPicture)
    // Preserve the original first-picture fallback if preferred artwork is unreadable.
    // Try at most two pictures rather than decoding every embedded image.
    return preferredCover !== null || preferredPicture === firstPicture
      ? preferredCover
      : await readPictureCover(firstPicture)
  } catch {
    return null
  }
}
