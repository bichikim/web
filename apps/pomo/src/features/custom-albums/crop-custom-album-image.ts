import {CUSTOM_ALBUM_COVER_EDGE, CustomAlbumError, MAXIMUM_CUSTOM_COVER_BYTES} from './model'

const INITIAL_WEBP_QUALITY = 0.82
const REDUCED_WEBP_QUALITY = 0.56

interface CropCustomAlbumImageOptions {
  readonly image: ImageBitmap
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
}

const encodeWebp = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new CustomAlbumError('invalid-cover'))
          return
        }

        resolve(blob)
      },
      'image/webp',
      quality,
    )
  })

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
  const sourceX = Math.min(Math.max(0, options.sourceX), options.image.width - sourceSize)
  const sourceY = Math.min(Math.max(0, options.sourceY), options.image.height - sourceSize)
  const canvas = globalThis.document.createElement('canvas')
  canvas.width = CUSTOM_ALBUM_COVER_EDGE
  canvas.height = CUSTOM_ALBUM_COVER_EDGE
  const context = canvas.getContext('2d', {alpha: false})

  if (context === null) {
    throw new CustomAlbumError('invalid-cover')
  }

  context.drawImage(
    options.image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    CUSTOM_ALBUM_COVER_EDGE,
    CUSTOM_ALBUM_COVER_EDGE,
  )

  const firstEncoding = await encodeWebp(canvas, INITIAL_WEBP_QUALITY)
  if (firstEncoding.type !== 'image/webp') {
    throw new CustomAlbumError('invalid-cover')
  }
  if (firstEncoding.size <= MAXIMUM_CUSTOM_COVER_BYTES) {
    return firstEncoding
  }

  const compressedEncoding = await encodeWebp(canvas, REDUCED_WEBP_QUALITY)
  if (compressedEncoding.type !== 'image/webp') {
    throw new CustomAlbumError('invalid-cover')
  }
  if (compressedEncoding.size > MAXIMUM_CUSTOM_COVER_BYTES) {
    throw new CustomAlbumError('cover-too-large')
  }

  return compressedEncoding
}
