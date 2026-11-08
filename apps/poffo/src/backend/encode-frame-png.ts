import {encode} from 'fast-png'

export interface FramePixels {
  /** Drawing-buffer width in physical pixels. */
  readonly width: number
  /** Drawing-buffer height in physical pixels. */
  readonly height: number
  /** Borrowed RGBA8 premultiplied bytes, starting at the bottom-left corner. */
  readonly pixels: Uint8Array
}

/** Encodes GPU bytes as a top-down, straight-alpha PNG without changing the input. */
export const encodeFramePng = ({height, pixels, width}: FramePixels): Uint8Array => {
  const COMPONENTS = 4
  const ALPHA_OFFSET = 3
  const MAXIMUM = 255
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.length !== width * height * COMPONENTS
  ) {
    throw new RangeError('Expected complete RGBA pixels and positive integer frame dimensions')
  }
  const data = new Uint8Array(pixels.length)
  const stride = width * COMPONENTS
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < stride; column += COMPONENTS) {
      const source = row * stride + column
      const destination = (height - 1 - row) * stride + column
      const alpha = pixels[source + ALPHA_OFFSET]!
      if (alpha > 0) {
        data[destination] = Math.min(MAXIMUM, Math.round((pixels[source]! * MAXIMUM) / alpha))
        data[destination + 1] = Math.min(
          MAXIMUM,
          Math.round((pixels[source + 1]! * MAXIMUM) / alpha),
        )
        data[destination + 2] = Math.min(
          MAXIMUM,
          Math.round((pixels[source + 2]! * MAXIMUM) / alpha),
        )
      }
      data[destination + ALPHA_OFFSET] = alpha
    }
  }
  return encode({data, height, width})
}
