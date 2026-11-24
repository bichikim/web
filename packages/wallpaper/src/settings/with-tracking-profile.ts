import type {
  PoffoTracking,
  PoffoTrackingProfile,
  PoffoTrackingProfiles,
  PoffoTrackingSettings,
} from './tracking'
import {trackingProfile} from './tracking-profile'

/** Replaces only the chosen input's fields, preserving its other fields and the legacy fallback. */
export const withTrackingProfile = (
  settings: PoffoTrackingSettings,
  patch: PoffoTrackingProfile,
  mode: PoffoTracking = settings.tracking ?? 'off',
): PoffoTrackingProfiles => ({
  ...settings.trackingProfiles,
  [mode]: {...trackingProfile(settings, mode), ...patch},
})
