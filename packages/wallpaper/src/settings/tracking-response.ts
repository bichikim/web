import {DEFAULT_TRACKING_OPTIONS, type PoffoTrackingOptions} from './tracking'

export interface TrackingResponse {
  readonly x: number
  readonly y: number
}
export const TRACKING_RESPONSE_FIELDS = {
  eye: {x: 'eyeResponseX', y: 'eyeResponseY'},
  head: {x: 'headResponseX', y: 'headResponseY'},
} as const

/** Resolves independent response gains, retaining the effective gains of legacy settings. */
export const resolveTrackingResponse = (
  options: PoffoTrackingOptions = {},
  target: 'head' | 'eye' = 'head',
): TrackingResponse => {
  const fields = TRACKING_RESPONSE_FIELDS[target]
  const scaleKey = target === 'head' ? 'headScale' : 'eyeScale'
  const verticalKey = target === 'head' ? 'headVerticalScale' : 'eyeVerticalScale'
  const scale = options[scaleKey] ?? DEFAULT_TRACKING_OPTIONS[scaleKey]
  const vertical = options[verticalKey] ?? DEFAULT_TRACKING_OPTIONS[verticalKey]
  return {x: options[fields.x] ?? scale, y: options[fields.y] ?? scale * vertical}
}
