/** Convert straight RGBA pixels to the byte representation used by premultiplied textures. */
export const premultiplyPixels = (pixels: Uint8ClampedArray): Uint8Array => {
  if (pixels.length % COMPONENTS_PER_PIXEL !== 0) {
    throw new RangeError('Expected complete RGBA pixels')
  }
  const result = new Uint8Array(pixels.length)
  for (let index = 0; index < pixels.length; index += COMPONENTS_PER_PIXEL) {
    const alpha = pixels[index + ALPHA_OFFSET]!
    result[index] = Math.round((pixels[index]! * alpha) / MAXIMUM_CHANNEL)
    result[index + 1] = Math.round((pixels[index + 1]! * alpha) / MAXIMUM_CHANNEL)
    result[index + 2] = Math.round((pixels[index + 2]! * alpha) / MAXIMUM_CHANNEL)
    result[index + ALPHA_OFFSET] = alpha
  }
  return result
}
const COMPONENTS_PER_PIXEL = 4
const ALPHA_OFFSET = 3
const MAXIMUM_CHANNEL = 255
