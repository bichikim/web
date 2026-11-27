import {decodeDataUrl} from './decode-data-url'

const decodeTexture = async (source: string): Promise<HTMLImageElement> => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  image.src = source
  try {
    await image.decode()
  } catch (cause) {
    // 모바일 Chromium의 비동기 디코딩이 실패해도 로드된 이미지는 렌더러가 읽을 수 있다.
    if (
      !(
        cause instanceof DOMException &&
        cause.name === 'EncodingError' &&
        image.complete &&
        image.naturalWidth > 0
      )
    ) {
      throw cause
    }
  }
  return image
}

/** 긴 data URL을 직접 로드하지 못하는 브라우저에서는 같은 이미지 바이트를 Blob URL로 읽는다. */
export const loadTextureImage = async (source: string): Promise<HTMLImageElement> => {
  try {
    return await decodeTexture(source)
  } catch (error) {
    const asset = decodeDataUrl(source)
    if (asset === undefined) {
      throw error
    }
    const [type] = asset.prefix.slice('data:'.length).split(';')
    const url = URL.createObjectURL(new Blob([asset.bytes], {type}))
    try {
      return await decodeTexture(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
