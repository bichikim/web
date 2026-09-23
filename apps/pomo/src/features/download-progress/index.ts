import {getUnboundedPercentage} from './get-unbounded-percentage'
export * from './get-unbounded-percentage'

const MAXIMUM_PERCENTAGE = 100

/** Rounds the byte ratio to a percentage capped at 100; callers handle unknown totals. */
export const getDownloadPercentage = (loadedBytes: number, totalBytes: number): number =>
  Math.min(MAXIMUM_PERCENTAGE, getUnboundedPercentage(loadedBytes, totalBytes))
