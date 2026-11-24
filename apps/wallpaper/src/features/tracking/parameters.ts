import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {resolveTrackingRange} from '@winter-love/wallpaper/settings/tracking-range'
import {
  resolveTrackingResponse,
  TRACKING_RESPONSE_FIELDS,
} from '@winter-love/wallpaper/settings/tracking-response'
import {POSE_ROTATION_DEGREES, type TrackingParameter, type TrackingPoint} from './types'

export const TRACKING_AXES = [
  {
    aliases: ['facex', 'anglex', 'paramanglex'],
    axis: 'x',
    cap: 'headLimitX',
    center: 'headCenterX',
    key: 'headX',
    label: '머리 좌우',
    limit: 12,
    ratio: 0.4,
    scale: 'headScale',
    target: 'head',
    verticalScale: null,
  },
  {
    aliases: ['facey', 'angley', 'paramangley'],
    axis: 'y',
    cap: 'headLimitY',
    center: 'headCenterY',
    key: 'headY',
    label: '머리 상하',
    limit: 8,
    ratio: 0.4,
    scale: 'headScale',
    target: 'head',
    verticalScale: 'headVerticalScale',
  },
  {
    aliases: ['facez', 'anglez', 'paramanglez'],
    axis: 'z',
    cap: 'headLimitZ',
    center: 'headCenterZ',
    key: 'headZ',
    label: '머리 기울기',
    limit: 30,
    ratio: 1,
    scale: 'headScale',
    target: 'head',
    verticalScale: null,
  },
  {
    aliases: ['gazex', 'eyeballx', 'parameyeballx'],
    axis: 'x',
    cap: 'eyeLimitX',
    center: 'eyeCenterX',
    key: 'eyeX',
    label: '눈동자 좌우',
    limit: 0.6,
    ratio: 0.6,
    scale: 'eyeScale',
    target: 'eye',
    verticalScale: null,
  },
  {
    aliases: ['gazey', 'eyebally', 'parameyebally'],
    axis: 'y',
    cap: 'eyeLimitY',
    center: 'eyeCenterY',
    key: 'eyeY',
    label: '눈동자 상하',
    limit: 0.6,
    ratio: 0.6,
    scale: 'eyeScale',
    target: 'eye',
    verticalScale: 'eyeVerticalScale',
  },
  {
    aliases: [],
    axis: 'x',
    cap: 'headLimitX',
    center: 'headCenterX',
    key: 'bodyX',
    label: '몸 좌우',
    limit: 10,
    ratio: 0.4,
    scale: 'headScale',
    target: 'head',
    verticalScale: null,
  },
] as const

export const resolveTrackingParameter = (
  parameters: readonly TrackingParameter[],
  key: keyof PoffoTrackingBindings,
  selected?: string | null,
): TrackingParameter | undefined => {
  if (selected === null) {
    return undefined
  }
  if (selected !== undefined) {
    return parameters.find((parameter) => parameter.id === selected)
  }
  const rule = TRACKING_AXES.find((rule) => rule.key === key)!
  const matches = parameters.filter((parameter) =>
    rule.aliases.some((alias) => alias === parameter.id.replace(/[-_]/gu, '').toLowerCase()),
  )
  return matches.length === 1 ? matches[0] : undefined
}

export const resolveTrackingInversion = (
  parameter: TrackingParameter | undefined,
  key: keyof PoffoTrackingBindings,
  selected?: boolean,
): boolean => selected ?? (key === 'eyeY' && parameter?.positiveY === 'down')

type TrackingSource = Exclude<PoffoTracking, 'off'>
type TrackingAxis = (typeof TRACKING_AXES)[number]

const axisResponse = (options: PoffoTrackingOptions, rule: TrackingAxis) => {
  const response =
    rule.axis === 'z'
      ? (options.headResponseZ ?? DEFAULT_TRACKING_OPTIONS.headResponseZ)
      : resolveTrackingResponse(options, rule.target)[rule.axis]
  const normal =
    rule.axis === 'z'
      ? DEFAULT_TRACKING_OPTIONS.headResponseZ
      : DEFAULT_TRACKING_OPTIONS[TRACKING_RESPONSE_FIELDS[rule.target][rule.axis]]
  const vertical =
    rule.verticalScale === null
      ? 1
      : (options[rule.verticalScale] ?? DEFAULT_TRACKING_OPTIONS[rule.verticalScale])
  return {
    disabled:
      vertical === 0 &&
      rule.axis !== 'z' &&
      options[TRACKING_RESPONSE_FIELDS[rule.target][rule.axis]] === undefined,
    gain: response / normal,
    response,
    scale: options[rule.scale] ?? DEFAULT_TRACKING_OPTIONS[rule.scale],
  }
}

const axisRange = (options: PoffoTrackingOptions, rule: TrackingAxis) => {
  const limits = resolveTrackingRange(options, rule.target)
  switch (rule.axis) {
    case 'x':
      return {lower: limits.minX, upper: limits.maxX}
    case 'y':
      return {lower: limits.minY, upper: limits.maxY}
    case 'z': {
      const limit = options.headLimitZ ?? DEFAULT_TRACKING_OPTIONS.headLimitZ
      return {lower: -limit, upper: limit}
    }
    default:
      throw new Error(`Unknown tracking axis: ${rule satisfies never}`)
  }
}

interface TrackingAmplitudeOptions {
  readonly source: TrackingSource
  readonly rule: TrackingAxis
  readonly scaled: number
  readonly range: number
  readonly endpoint: number
  readonly direction: number
  readonly gain: number
}
const trackingAmplitude = (options: TrackingAmplitudeOptions): number => {
  switch (options.source) {
    case 'camera-pose':
      return (
        Math.abs(options.scaled) *
        Math.min(
          options.rule.target === 'head' ? POSE_ROTATION_DEGREES : options.range,
          options.range,
        )
      )
    case 'camera':
      return (
        Math.abs(options.scaled) * Math.min(options.rule.limit, options.range * options.rule.ratio)
      )
    case 'cursor': {
      const progress = Math.abs(options.direction)
      const weighted = options.gain * progress
      // Cursor gain shapes the middle of the curve while preserving its 0 and 1 endpoints.
      const influence = options.gain === 0 ? 0 : weighted / (1 - progress + weighted)
      return options.endpoint * influence
    }
    default:
      throw new Error(`Unknown tracking source: ${options.source satisfies never}`)
  }
}

/** Maps independently followed head, body and eye directions to bounded calibrated poses. */
export const createTrackingParameters = (
  parameters: readonly TrackingParameter[],
  bindings: PoffoTrackingBindings = {},
  options: PoffoTrackingOptions = {},
  source: TrackingSource = 'camera',
) => {
  const mapped = TRACKING_AXES.flatMap((rule) => {
    const binding = bindings[rule.key]
    const parameter = resolveTrackingParameter(parameters, rule.key, binding?.parameterId)
    return parameter === undefined || (rule.axis === 'z' && source !== 'camera-pose')
      ? []
      : [
          {
            inverted: resolveTrackingInversion(parameter, rule.key, binding?.inverted),
            parameter,
            rule,
            weight:
              rule.key === 'bodyX' ? (options.bodyScale ?? DEFAULT_TRACKING_OPTIONS.bodyScale) : 1,
          },
        ]
  })
  return (
    point: TrackingPoint,
    origin: TrackingPoint = {x: 0, y: 0},
    body: TrackingPoint = point,
    eyes: TrackingPoint = point,
  ): Readonly<Record<string, number>> =>
    Object.fromEntries(
      mapped.map(({parameter, rule, inverted, weight}) => {
        const primary = {eye: eyes, head: point}
        const tracked = rule.key === 'bodyX' ? body : primary[rule.target]
        const direction = Math.max(-1, Math.min(1, tracked[rule.axis] ?? 0)) * (inverted ? -1 : 1)
        if (rule.key === 'bodyX' && source === 'camera-pose') {
          const range =
            direction < 0
              ? parameter.defaultValue - parameter.minimum
              : parameter.maximum - parameter.defaultValue
          return [
            parameter.id,
            parameter.defaultValue + direction * Math.min(POSE_ROTATION_DEGREES, range) * weight,
          ]
        }
        const center = (origin[rule.axis] ?? 0) * (inverted ? -1 : 1)
        const response = axisResponse(options, rule)
        const scaled = response.disabled
          ? 0
          : source === 'camera-pose'
            ? direction * response.gain * response.scale
            : center * response.scale + (direction - center) * response.response
        const offset =
          (options[rule.center] ?? DEFAULT_TRACKING_OPTIONS[rule.center]) *
          (inverted ? -1 : 1) *
          weight
        const neutral = Math.max(
          parameter.minimum,
          Math.min(parameter.maximum, parameter.defaultValue + offset),
        )
        const range = scaled < 0 ? neutral - parameter.minimum : parameter.maximum - neutral
        const {lower, upper} = axisRange(options, rule)
        const minimum = inverted ? -upper : lower
        const maximum = inverted ? -lower : upper
        const endpoint = Math.min(range, Math.max(0, scaled < 0 ? -minimum : maximum))
        const amplitude = trackingAmplitude({
          direction,
          endpoint,
          gain: response.gain,
          range,
          rule,
          scaled,
          source,
        })
        const delta = Math.max(minimum, Math.min(maximum, Math.sign(scaled) * amplitude)) * weight
        return [
          parameter.id,
          Math.max(parameter.minimum, Math.min(parameter.maximum, neutral + delta)),
        ]
      }),
    )
}

/** Returns only configured center overrides, without suppressing other idle parameters. */
export const createTrackingCenters = (
  parameters: readonly TrackingParameter[],
  bindings: PoffoTrackingBindings = {},
  options: PoffoTrackingOptions = {},
): Readonly<Record<string, number>> => {
  const centered = new Set(
    TRACKING_AXES.flatMap((rule) => {
      const parameter = resolveTrackingParameter(
        parameters,
        rule.key,
        bindings[rule.key]?.parameterId,
      )
      return parameter === undefined || (options[rule.center] ?? 0) === 0 ? [] : [parameter.id]
    }),
  )
  const values = createTrackingParameters(parameters, bindings, options)({x: 0, y: 0})
  return Object.fromEntries(Object.entries(values).filter(([id]) => centered.has(id)))
}
