import {decodeDataUrl} from './decode-data-url'

/** 긴 data URL을 직접 디코딩하지 못하는 브라우저에서는 같은 이미지 바이트를 Blob URL로 읽는다. */
export const loadTextureImage = async (source: string): Promise<HTMLImageElement> => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  image.src = source
  try {
    await image.decode()
  } catch (error) {
    const asset = decodeDataUrl(source)
    if (asset === undefined) {
      throw error
    }
    const [type] = asset.prefix.slice('data:'.length).split(';')
    const url = URL.createObjectURL(new Blob([asset.bytes], {type}))
    try {
      image.src = url
      await image.decode()
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  return image
}
