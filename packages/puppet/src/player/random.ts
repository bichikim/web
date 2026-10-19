/** Uniform 0..1 numbers. */
export type RandomSource = () => number

/** Park–Miller minimal standard generator: exact in doubles, so Rust repeats it. */
const MODULUS = 2_147_483_647
const MULTIPLIER = 48_271

/**
 * Seeded uniform numbers in 0..1 that the Rust player repeats exactly, so seeded random
 * choices (blink timing, motion groups) match across players.
 */
export const createSeededRandom = (seed: number): RandomSource => {
  // Seeds map onto the generator's states 1..MODULUS-1, seed 1 being state 1.
  let state = ((((Math.trunc(seed) - 1) % (MODULUS - 1)) + (MODULUS - 1)) % (MODULUS - 1)) + 1
  return () => {
    state = (state * MULTIPLIER) % MODULUS
    return (state - 1) / (MODULUS - 1)
  }
}
