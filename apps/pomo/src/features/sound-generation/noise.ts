// oxlint-disable no-bitwise -- xorshift32 intentionally uses bitwise operations.
// oxlint-disable no-magic-numbers -- Box-Muller and xorshift32 constants define the noise source.

const UINT32_SIZE = 0x1_0000_0000
const NON_ZERO_SEED = 0x9e37_79b9

export type ChunkNoiseMode = 'continuous' | 'repeat'

export const DEFAULT_CHUNK_NOISE_MODE: ChunkNoiseMode = 'continuous'

export interface NoiseSource {
  readonly next: (length: number) => Float32Array
}

export function createNoiseSeed(): number {
  const values = new Uint32Array(1)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(values)
    return values[0]
  }
  return Math.floor(Math.random() * UINT32_SIZE)
}

export function createRandomNoiseSource(): NoiseSource {
  return createSeededNoiseSource(createNoiseSeed())
}

export function createSeededNoiseSource(seed: number): NoiseSource {
  let state = seed >>> 0 || NON_ZERO_SEED
  const nextUnit = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / UINT32_SIZE
  }
  return {
    next: (length) => {
      const noise = new Float32Array(length)
      for (let index = 0; index < length; index += 2) {
        const radius = Math.sqrt(-2 * Math.log(1 - nextUnit()))
        const angle = 2 * Math.PI * nextUnit()
        noise[index] = radius * Math.cos(angle)
        if (index + 1 < length) {
          noise[index + 1] = radius * Math.sin(angle)
        }
      }
      return noise
    },
  }
}

export function createNoise(length: number, source = createRandomNoiseSource()): Float32Array {
  return source.next(length)
}
