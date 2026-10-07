/** Samples a continuous interval with an optional caller-owned random source. */
export const randomInRange = (
  minimum: number,
  maximum: number,
  random: () => number = Math.random,
): number => minimum + random() * (maximum - minimum)
