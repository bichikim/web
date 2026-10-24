import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {resolveTrackingRange} from '@winter-love/wallpaper/settings/tracking-range'
import {
  resolveTrackingResponse,
  TRACKING_RESPONSE_FIELDS,
} from '@winter-love/wallpaper/settings/tracking-response'
import type {TrackingParameter, TrackingPoint} from './types'

export const TRACKING_AXES = [
  {
    aliases: ['facex', 'anglex', 'paramanglex'],
    axis: 'x',
    cap: 'headLimitX',
    center: 'headCenterX',
    key: 'headX',
    label: '얼굴 좌우',
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
    label: '얼굴 상하',
    limit: 8,
    ratio: 0.4,
    scale: 'headScale',
    target: 'head',
    verticalScale: 'headVerticalScale',
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

/** Maps bounded target directions to the selected head and gaze parameters. */
export const createTrackingParameters = (
  parameters: readonly TrackingParameter[],
  bindings: PoffoTrackingBindings = {},
  options: PoffoTrackingOptions = {},
) => {
  const mapped = TRACKING_AXES.flatMap((rule) => {
    const binding = bindings[rule.key]
    const parameter = resolveTrackingParameter(parameters, rule.key, binding?.parameterId)
    return parameter === undefined
      ? []
      : [
          {
            inverted: resolveTrackingInversion(parameter, rule.key, binding?.inverted),
            parameter,
            rule,
          },
        ]
  })
  return (
    point: TrackingPoint,
    origin: TrackingPoint = {x: 0, y: 0},
  ): Readonly<Record<string, number>> =>
    Object.fromEntries(
      mapped.map(({parameter, rule, inverted}) => {
        const direction = Math.max(-1, Math.min(1, point[rule.axis])) * (inverted ? -1 : 1)
        const scale = options[rule.scale] ?? DEFAULT_TRACKING_OPTIONS[rule.scale]
        const verticalScale =
          rule.verticalScale === null
            ? 1
            : (options[rule.verticalScale] ?? DEFAULT_TRACKING_OPTIONS[rule.verticalScale])
        const center = origin[rule.axis] * (inverted ? -1 : 1)
        const response = resolveTrackingResponse(options, rule.target)[rule.axis]
        const legacyDisabled =
          verticalScale === 0 &&
          options[TRACKING_RESPONSE_FIELDS[rule.target][rule.axis]] === undefined
        const scaled = legacyDisabled ? 0 : center * scale + (direction - center) * response
        const offset =
          (options[rule.center] ?? DEFAULT_TRACKING_OPTIONS[rule.center]) * (inverted ? -1 : 1)
        const neutral = Math.max(
          parameter.minimum,
          Math.min(parameter.maximum, parameter.defaultValue + offset),
        )
        const range = scaled < 0 ? neutral - parameter.minimum : parameter.maximum - neutral
        const amplitude = Math.abs(scaled) * Math.min(rule.limit, range * rule.ratio)
        const limits = resolveTrackingRange(options, rule.target)
        const lower = rule.axis === 'x' ? limits.minX : limits.minY
        const upper = rule.axis === 'x' ? limits.maxX : limits.maxY
        const minimum = inverted ? -upper : lower
        const maximum = inverted ? -lower : upper
        const delta = Math.max(minimum, Math.min(maximum, Math.sign(scaled) * amplitude))
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
