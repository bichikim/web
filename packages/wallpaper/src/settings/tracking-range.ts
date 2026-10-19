import {DEFAULT_TRACKING_OPTIONS, type PoffoTrackingOptions} from './tracking'

export interface TrackingRange {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}
export const TRACKING_RANGE_FIELDS = {
  eye: {
    maxX: 'eyeMaximumX',
    maxY: 'eyeMaximumY',
    minX: 'eyeMinimumX',
    minY: 'eyeMinimumY',
  },
  head: {
    maxX: 'headMaximumX',
    maxY: 'headMaximumY',
    minX: 'headMinimumX',
    minY: 'headMinimumY',
  },
} as const

/** Resolves directional bounds, retaining symmetric limits saved by earlier versions. */
export const resolveTrackingRange = (
  options: PoffoTrackingOptions = {},
  target: 'head' | 'eye' = 'head',
): TrackingRange => {
  const fields = TRACKING_RANGE_FIELDS[target]
  const limitX = target === 'head' ? 'headLimitX' : 'eyeLimitX'
  const limitY = target === 'head' ? 'headLimitY' : 'eyeLimitY'
  const horizontal = options[limitX] ?? DEFAULT_TRACKING_OPTIONS[limitX]
  const vertical = options[limitY] ?? DEFAULT_TRACKING_OPTIONS[limitY]
  return {
    maxX: options[fields.maxX] ?? horizontal,
    maxY: options[fields.maxY] ?? vertical,
    minX: options[fields.minX] ?? -horizontal,
    minY: options[fields.minY] ?? -vertical,
  }
}
