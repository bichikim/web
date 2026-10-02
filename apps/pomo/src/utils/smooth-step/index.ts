const HERMITE_SCALE = 3

/** Returns the cubic Hermite easing value for progress in the unit interval. */
export const smoothStep = (progress: number): number =>
  progress * progress * (HERMITE_SCALE - 2 * progress)
