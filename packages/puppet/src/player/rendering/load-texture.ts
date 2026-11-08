import {Texture} from 'pixi.js'
import {loadTextureImage} from './load-texture-image'
import {premultiplyPixels} from './premultiply-pixels'

/** The caller owns the texture and its source. */
export const loadTexture = async (source: string): Promise<Texture> => {
  const image = await loadTextureImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  try {
    const context = canvas.getContext('2d', {colorSpace: 'srgb', willReadFrequently: true})
    if (context === null) {
      throw new Error('Cannot read texture pixels')
    }
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    // WebKit's image upload can produce different premultiplied bytes across WebGL contexts.
    // Upload explicit bytes so detached captures and the interactive renderer share the same input.
    return Texture.from({
      alphaMode: 'premultiplied-alpha',
      autoGenerateMipmaps: true,
      format: 'rgba8unorm',
      height: canvas.height,
      resource: premultiplyPixels(pixels.data),
      scaleMode: 'linear',
      width: canvas.width,
    })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
