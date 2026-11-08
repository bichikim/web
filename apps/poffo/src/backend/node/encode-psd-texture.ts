import {PNG} from 'pngjs'
import type {PsdTextureEncoder} from '@winter-love/puppet/converter'

/** Encodes layer RGBA without Canvas or a native image library. */
export const encodePsdTexture: PsdTextureEncoder = async (pixels) => {
  const image = new PNG({
    height: pixels.height,
    width: pixels.width,
  })
  image.data.set(pixels.data)
  const encoded = PNG.sync.write(image)
  return `data:image/png;base64,${encoded.toString('base64')}`
}
