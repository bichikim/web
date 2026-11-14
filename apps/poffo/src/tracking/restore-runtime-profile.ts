import type {PuppetDocument} from '@winter-love/puppet/player'
import {normalizeProfileMultipliers} from './normalize-profile-multipliers'
import {createRuntimeProfile} from './create-runtime-profile'
import {parseRuntimeProfile} from './parse-runtime-profile'
import type {RuntimeProfile} from './types'

/** Restores current settings or adds mouth tracking to a validated legacy profile. */
export const restoreRuntimeProfile = (
  value: unknown,
  document: PuppetDocument,
): RuntimeProfile | undefined => {
  if (typeof value !== 'object' || value === null || !('version' in value)) {
    return undefined
  }
  if (value.version !== 1) {
    const parsed = parseRuntimeProfile(value, document)
    return parsed === undefined ? undefined : normalizeProfileMultipliers(parsed)
  }
  const parsed = parseRuntimeProfile({...value, version: 2}, document)
  if (parsed === undefined) {
    return undefined
  }
  const additions = createRuntimeProfile(document).mappings.filter(
    (mapping) =>
      (mapping.input === 'mouthRound' || mapping.input === 'mouthSpread') &&
      !parsed.mappings.some((current) => current.parameterId === mapping.parameterId),
  )
  return normalizeProfileMultipliers({...parsed, mappings: [...parsed.mappings, ...additions]})
}
