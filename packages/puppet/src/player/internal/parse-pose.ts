import type {PuppetParameter, PuppetPart, PuppetPoseEntry, PuppetPoseGroup} from '../document'
import {isFiniteNumber, isRecord} from './parse-primitives'

const hasKnownIds = (
  value: unknown,
  knownIds: ReadonlySet<string>,
): value is ReadonlyArray<string> =>
  Array.isArray(value) &&
  value.length > 0 &&
  new Set(value).size === value.length &&
  value.every((id) => typeof id === 'string' && knownIds.has(id))

const isPoseEntry = (value: unknown, partIds: ReadonlySet<string>): value is PuppetPoseEntry =>
  isRecord(value) && isFiniteNumber(value.value) && hasKnownIds(value.partIds, partIds)

const isPoseGroup = (
  value: unknown,
  partIds: ReadonlySet<string>,
  parameterIds: ReadonlySet<string>,
): value is PuppetPoseGroup =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.parameterId === 'string' &&
  parameterIds.has(value.parameterId) &&
  (value.fadeTime === undefined || (isFiniteNumber(value.fadeTime) && value.fadeTime >= 0)) &&
  Array.isArray(value.entries) &&
  value.entries.length > 0 &&
  value.entries.every((entry) => isPoseEntry(entry, partIds)) &&
  new Set(value.entries.map((entry: PuppetPoseEntry) => entry.value)).size === value.entries.length

/** Checks pose groups; a part may belong to only one entry across all groups. */
export const hasValidPoseGroups = (
  value: unknown,
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
): value is ReadonlyArray<PuppetPoseGroup> | undefined => {
  if (value === undefined) {
    return true
  }
  if (!Array.isArray(value)) {
    return false
  }
  const partIds = new Set(parts.map((part) => part.id))
  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  if (!value.every((group) => isPoseGroup(group, partIds, parameterIds))) {
    return false
  }
  const groups: ReadonlyArray<PuppetPoseGroup> = value
  const posedPartIds = groups.flatMap((group) => group.entries.flatMap((entry) => entry.partIds))
  return (
    new Set(groups.map((group) => group.id)).size === groups.length &&
    new Set(posedPartIds).size === posedPartIds.length
  )
}
