import {
  poffoTrackingOptionsSchema,
  type PoffoTrackingProfiles,
  poffoTrackingSchema,
  type PoffoTrackingSettings,
} from './tracking'
import {trackingProfile} from './tracking-profile'
import type {ConnectionUpdateMode} from './merge-connections'

interface MergeTrackingProfilesOptions {
  /** Current persisted or optimistic settings; never mutated. */
  readonly current: PoffoTrackingSettings
  /** Imported settings; legacy shared values apply to every input. */
  readonly incoming: PoffoTrackingSettings
  /** Merge preserves existing calibration fields while applying the supplied values. */
  readonly mode: ConnectionUpdateMode
}

/** Applies old shared presets and new input-specific presets without mixing the input settings. */
export const mergeTrackingProfiles = (
  options: MergeTrackingProfilesOptions,
): PoffoTrackingProfiles | undefined => {
  const {current, incoming, mode} = options
  if (
    incoming.trackingProfiles === undefined &&
    incoming.trackingOptions === undefined &&
    incoming.trackingBindings === undefined
  ) {
    return current.trackingProfiles
  }
  const assign = <Value>(previous: Value | undefined, next: Value | undefined) =>
    next === undefined || (mode === 'missing' && previous !== undefined) ? previous : next
  return Object.fromEntries(
    poffoTrackingSchema.options.flatMap((input) => {
      const profile = incoming.trackingProfiles?.[input]
      const bindings = profile?.bindings ?? incoming.trackingBindings
      const calibration = profile?.options ?? incoming.trackingOptions
      if (bindings === undefined && calibration === undefined) {
        const previous = current.trackingProfiles?.[input]
        return previous === undefined ? [] : [[input, previous]]
      }
      const previous = trackingProfile(current, input)
      return [
        [
          input,
          {
            bindings: assign(previous.bindings, bindings),
            options:
              mode === 'merge' && calibration !== undefined
                ? poffoTrackingOptionsSchema.parse({...previous.options, ...calibration})
                : assign(previous.options, calibration),
          },
        ],
      ]
    }),
  )
}
