const MINIMUM_RANDOM_VALUE = 0.0001
const BOX_MULLER_SCALE = -2

export interface CreateGaussianNoiseOptions {
  readonly length: number
  readonly random: () => number
}

/** Generates Float32 normal samples, bounding radial draws at 0.0001 and consuming two draws per sample. */
export const createGaussianNoise = (options: CreateGaussianNoiseOptions): Float32Array => {
  const {length, random} = options
  const noise = new Float32Array(length)

  for (let index = 0; index < length; index += 1) {
    const firstRandom = Math.max(MINIMUM_RANDOM_VALUE, random())
    const secondRandom = random()
    noise[index] =
      Math.sqrt(BOX_MULLER_SCALE * Math.log(firstRandom)) *
      Math.cos(-BOX_MULLER_SCALE * Math.PI * secondRandom)
  }

  return noise
}
