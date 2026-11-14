/** Uniform 0..1 numbers. */
export type RandomSource = () => number

/** Park–Miller minimal standard generator: exact in doubles, so Rust repeats it. */
const MODULUS = 2_147_483_647
const MULTIPLIER = 48_271

/**
 * Seeded uniform numbers in 0..1 that the Rust player repeats exactly, so seeded random
 * choices (blink timing, motion groups) match across players.
 */
export interface SeededRandom {
  (): number
  capture(): number
  restore(state: number): void
}

export const createSeededRandom = (seed: number): SeededRandom => {
  if (!Number.isFinite(seed)) {
    throw new RangeError('Random seed must be finite')
  }
  // Seeds map onto the generator's states 1..MODULUS-1, seed 1 being state 1.
  let state = ((((Math.trunc(seed) - 1) % (MODULUS - 1)) + (MODULUS - 1)) % (MODULUS - 1)) + 1
  const next = () => {
    state = (state * MULTIPLIER) % MODULUS
    return (state - 1) / (MODULUS - 1)
  }
  return Object.assign(next, {
    capture: () => state,
    restore(value: number) {
      if (!Number.isInteger(value) || value < 1 || value >= MODULUS) {
        throw new RangeError('Random checkpoint is outside the generator state range')
      }
      state = value
    },
  })
}
