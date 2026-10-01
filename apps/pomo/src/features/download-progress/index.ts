import {clamp} from 'es-toolkit/math'
import {getUnboundedPercentage} from '../progress'

const MAXIMUM_PERCENTAGE = 100

/** Rounds the byte ratio to a percentage capped at 100; callers handle unknown totals. */
export const getDownloadPercentage = (loadedBytes: number, totalBytes: number): number =>
  clamp(
    getUnboundedPercentage(loadedBytes, totalBytes),
    Number.NEGATIVE_INFINITY,
    MAXIMUM_PERCENTAGE,
  )
