import type {FrameAlphaSample} from '@winter-love/puppet/player'

const RGBA_CHANNELS = 4
const ALPHA_CHANNEL = 3

/** Copies the alpha channel of an already sampled RGBA image. */
export const extractAlpha = (image: ImageData): FrameAlphaSample => {
  const {data, height, width} = image
  const alpha = new Uint8Array(width * height)
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    alpha[pixel] = data[pixel * RGBA_CHANNELS + ALPHA_CHANNEL]!
  }
  return {data: alpha, height, width}
}
