const MINIMUM_MULTIPLIER = 0.1
const MAXIMUM_MULTIPLIER = 50
export const TRACKING_MULTIPLIER_RANGE = [MINIMUM_MULTIPLIER, MAXIMUM_MULTIPLIER] as const
export const isTrackingMultiplier = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= MINIMUM_MULTIPLIER &&
  value <= MAXIMUM_MULTIPLIER
