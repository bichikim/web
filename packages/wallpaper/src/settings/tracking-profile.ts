import type {PoffoTracking, PoffoTrackingProfile, PoffoTrackingSettings} from './tracking'

/** Resolves one input without borrowing calibration from another input. */
export const trackingProfile = (
  settings: PoffoTrackingSettings | undefined,
  mode: PoffoTracking = settings?.tracking ?? 'off',
): PoffoTrackingProfile => {
  const profile = settings?.trackingProfiles?.[mode]
  return {
    bindings: profile?.bindings ?? settings?.trackingBindings,
    options: profile?.options ?? settings?.trackingOptions,
  }
}
