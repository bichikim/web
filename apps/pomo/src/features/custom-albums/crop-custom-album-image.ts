import {clamp} from 'es-toolkit/math'
import {createSquareWebpEncoder} from 'src/utils/square-webp-cover'
import {CUSTOM_ALBUM_COVER_EDGE, CustomAlbumError, MAXIMUM_CUSTOM_COVER_BYTES} from './model'

const INITIAL_WEBP_QUALITY = 0.82
const REDUCED_WEBP_QUALITY = 0.56

interface CropCustomAlbumImageOptions {
  readonly image: ImageBitmap
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
}

export const cropCustomAlbumImage = async (options: CropCustomAlbumImageOptions): Promise<Blob> => {
  if (
    !Number.isFinite(options.sourceSize) ||
    options.sourceSize <= 0 ||
    !Number.isFinite(options.sourceX) ||
    !Number.isFinite(options.sourceY)
  ) {
    throw new CustomAlbumError('invalid-cover')
  }

  const sourceSize = Math.min(options.sourceSize, options.image.width, options.image.height)
  const sourceX = clamp(options.sourceX, 0, options.image.width - sourceSize)
  const sourceY = clamp(options.sourceY, 0, options.image.height - sourceSize)
  const encode = createSquareWebpEncoder({
    contextError: () => new CustomAlbumError('invalid-cover'),
    contextOptions: {alpha: false},
    encodingError: () => new CustomAlbumError('invalid-cover'),
    source: options.image,
    sourceSize,
    sourceX,
    sourceY,
    targetSize: CUSTOM_ALBUM_COVER_EDGE,
  })

  const firstEncoding = await encode(INITIAL_WEBP_QUALITY)
  if (firstEncoding.type !== 'image/webp') {
    throw new CustomAlbumError('invalid-cover')
  }
  if (firstEncoding.size <= MAXIMUM_CUSTOM_COVER_BYTES) {
    return firstEncoding
  }

  const compressedEncoding = await encode(REDUCED_WEBP_QUALITY)
  if (compressedEncoding.type !== 'image/webp') {
    throw new CustomAlbumError('invalid-cover')
  }
  if (compressedEncoding.size > MAXIMUM_CUSTOM_COVER_BYTES) {
    throw new CustomAlbumError('cover-too-large')
  }

  return compressedEncoding
}
