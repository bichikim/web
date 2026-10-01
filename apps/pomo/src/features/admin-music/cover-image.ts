import {createSquareWebpEncoder, getCenteredSquareCrop} from 'src/utils/square-webp-cover'
import {validateAlbumCover} from './cover-upload'

export const COVER_IMAGE_EDGE = 1200
export const COVER_IMAGE_TYPE = 'image/webp'
export const COVER_IMAGE_QUALITY = 0.85

interface DecodedCoverImage {
  readonly close: () => void
  readonly height: number
  readonly source: CanvasImageSource
  readonly width: number
}

interface EncodeCoverImageOptions {
  readonly quality: number
  readonly source: CanvasImageSource
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
  readonly targetSize: number
  readonly type: string
}

export interface CoverImageRuntime {
  readonly decode: (file: File) => Promise<DecodedCoverImage>
  readonly encode: (options: EncodeCoverImageOptions) => Promise<Blob>
}

const createBrowserRuntime = (): CoverImageRuntime => ({
  decode: async (file) => {
    const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'})

    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
    }
  },
  encode: (options) =>
    createSquareWebpEncoder({
      ...options,
      contextError: () => new Error('커버 이미지를 처리할 Canvas를 만들지 못했습니다.'),
      encodingError: () => new Error('커버 이미지를 WebP로 변환하지 못했습니다.'),
    })(options.quality),
})

export const prepareAlbumCover = async (
  file: File,
  runtime: CoverImageRuntime = createBrowserRuntime(),
): Promise<File> => {
  validateAlbumCover(file)
  const image = await runtime.decode(file)

  try {
    if (image.width <= 0 || image.height <= 0) {
      throw new TypeError('크기를 확인할 수 없는 커버 이미지입니다.')
    }

    const blob = await runtime.encode({
      quality: COVER_IMAGE_QUALITY,
      source: image.source,
      ...getCenteredSquareCrop(image.width, image.height),
      targetSize: COVER_IMAGE_EDGE,
      type: COVER_IMAGE_TYPE,
    })

    if (blob.type !== COVER_IMAGE_TYPE) {
      throw new TypeError('이 브라우저는 WebP 커버 변환을 지원하지 않습니다.')
    }

    const preparedFile = new File([blob], 'cover.webp', {type: COVER_IMAGE_TYPE})
    validateAlbumCover(preparedFile)
    return preparedFile
  } finally {
    image.close()
  }
}
