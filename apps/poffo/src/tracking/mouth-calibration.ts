import type {MouthTrackingSettings, TrackingValues} from './types'

import {TRACKING_MULTIPLIER_RANGE} from './multiplier'
export const MOUTH_SENSITIVITY_RANGE = TRACKING_MULTIPLIER_RANGE
export const MOUTH_INPUTS = ['mouthOpen', 'mouthRound', 'mouthSpread'] as const
export const DEFAULT_MOUTH_SETTINGS: MouthTrackingSettings = {
  neutral: {mouthOpen: 0, mouthRound: 0, mouthSpread: 0},
  openSensitivity: 1,
  roundSensitivity: 1,
  spreadSensitivity: 1,
}

/** Subtracts the resting mouth pose and scales the remaining movement to normalized inputs. */
export const calibrateMouthValues = (
  values: TrackingValues,
  settings: MouthTrackingSettings = DEFAULT_MOUTH_SETTINGS,
): TrackingValues => ({
  ...values,
  ...Object.fromEntries(
    MOUTH_INPUTS.flatMap((input) => {
      const value = values[input]
      if (value === undefined) {
        return []
      }
      const baseline = settings.neutral[input]
      const sensitivities = {
        mouthOpen: settings.openSensitivity ?? 1,
        mouthRound: settings.roundSensitivity,
        mouthSpread: settings.spreadSensitivity,
      }
      const sensitivity = sensitivities[input]
      const amount = baseline >= 1 ? 0 : ((value - baseline) / (1 - baseline)) * sensitivity
      return [[input, Math.min(1, Math.max(0, amount))]]
    }),
  ),
})

/** Validates resting scores and independent sensitivity multipliers. */
export const isMouthTrackingSettings = (value: unknown): value is MouthTrackingSettings => {
  if (typeof value !== 'object' || value === null || !('neutral' in value)) {
    return false
  }
  const {neutral} = value
  if (typeof neutral !== 'object' || neutral === null) {
    return false
  }
  const validNeutral = MOUTH_INPUTS.every((key) => {
    const score: unknown = Reflect.get(neutral, key)
    return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1
  })
  return (
    validNeutral &&
    ['openSensitivity', 'roundSensitivity', 'spreadSensitivity'].every((key) => {
      if (key === 'openSensitivity' && !('openSensitivity' in value)) {
        return true
      }
      const sensitivity: unknown = Reflect.get(value, key)
      return (
        typeof sensitivity === 'number' &&
        Number.isFinite(sensitivity) &&
        sensitivity >= MOUTH_SENSITIVITY_RANGE[0] &&
        sensitivity <= MOUTH_SENSITIVITY_RANGE[1]
      )
    })
  )
}
