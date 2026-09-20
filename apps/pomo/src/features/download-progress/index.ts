const MAXIMUM_PERCENTAGE = 100

/** Rounds the byte ratio to a percentage capped at 100; callers handle unknown totals. */
export const getDownloadPercentage = (loadedBytes: number, totalBytes: number): number =>
  Math.min(MAXIMUM_PERCENTAGE, Math.round((loadedBytes / totalBytes) * MAXIMUM_PERCENTAGE))
