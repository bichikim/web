import type {PixelData} from '../../mesh'
import type {PuppetTexture} from '../../player/document'
import {MAXIMUM_TEXTURE_PIXELS} from './texture-limits'

export type ReadTexturePixelsErrorCode = 'decode-failed' | 'render-failed' | 'too-large'

export interface ReadTexturePixelsFailure {
  readonly error: {readonly code: ReadTexturePixelsErrorCode}
  readonly ok: false
}

export interface ReadTexturePixelsSuccess {
  readonly ok: true
  readonly pixels: PixelData
}

export type ReadTexturePixelsResult = ReadTexturePixelsFailure | ReadTexturePixelsSuccess

export interface ReadTexturePixelsOptions {
  readonly texture: PuppetTexture
}

const decodeTexture = async (texture: PuppetTexture) => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  image.src = texture.src

  try {
    await image.decode()
    return image
  } catch {
    return undefined
  }
}

export const readTexturePixels = async (
  options: ReadTexturePixelsOptions,
): Promise<ReadTexturePixelsResult> => {
  const {texture} = options

  if (texture.width * texture.height > MAXIMUM_TEXTURE_PIXELS) {
    return {error: {code: 'too-large'}, ok: false}
  }

  const image = await decodeTexture(texture)

  if (image === undefined) {
    return {error: {code: 'decode-failed'}, ok: false}
  }

  const canvas = window.document.createElement('canvas')
  canvas.width = texture.width
  canvas.height = texture.height
  const context = canvas.getContext('2d', {willReadFrequently: true})

  if (context === null) {
    return {error: {code: 'render-failed'}, ok: false}
  }

  try {
    context.drawImage(image, 0, 0, texture.width, texture.height)

    return {
      ok: true,
      pixels: context.getImageData(0, 0, texture.width, texture.height),
    }
  } catch {
    return {error: {code: 'render-failed'}, ok: false}
  }
}
