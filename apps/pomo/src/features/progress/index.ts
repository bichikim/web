const PERCENTAGE_SCALE = 100

/** Rounds a measured-to-total ratio without capping the result. */
export const getUnboundedPercentage = (loaded: number, total: number): number =>
  Math.round((loaded / total) * PERCENTAGE_SCALE)
