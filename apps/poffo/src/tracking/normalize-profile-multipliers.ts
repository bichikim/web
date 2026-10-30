import {DEFAULT_MOUTH_SETTINGS} from './mouth-calibration'
import {TRACKING_MULTIPLIER_RANGE} from './multiplier'
import type {RuntimeProfile} from './types'

/** Moves legacy mouth gains into connection multipliers without applying them twice. */
export const normalizeProfileMultipliers = (profile: RuntimeProfile): RuntimeProfile => {
  const {mouth} = profile
  if (mouth === undefined) {
    return profile
  }
  const gains: Readonly<Record<string, number>> = {
    mouthOpen: mouth.openSensitivity ?? 1,
    mouthRound: mouth.roundSensitivity,
    mouthSpread: mouth.spreadSensitivity,
  }
  if (Object.values(gains).every((gain) => gain === 1)) {
    return profile
  }
  return {
    ...profile,
    mappings: profile.mappings.map((mapping) => ({
      ...mapping,
      multiplier: Math.min(
        TRACKING_MULTIPLIER_RANGE[1],
        Math.max(
          TRACKING_MULTIPLIER_RANGE[0],
          (mapping.multiplier ?? 1) * (gains[mapping.input] ?? 1),
        ),
      ),
    })),
    mouth: {...DEFAULT_MOUTH_SETTINGS, neutral: mouth.neutral},
  }
}
