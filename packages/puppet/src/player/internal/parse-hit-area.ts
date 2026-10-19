import type {PuppetHitArea, PuppetPart} from '../document'
import {isRecord} from './parse-primitives'

const isHitArea = (value: unknown, partIds: ReadonlySet<string>): value is PuppetHitArea =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  Array.isArray(value.partIds) &&
  value.partIds.length > 0 &&
  new Set(value.partIds).size === value.partIds.length &&
  value.partIds.every((id) => typeof id === 'string' && partIds.has(id))

/** Checks hit areas against the document's parts. */
export const hasValidHitAreas = (
  value: unknown,
  parts: ReadonlyArray<PuppetPart>,
): value is ReadonlyArray<PuppetHitArea> | undefined => {
  if (value === undefined) {
    return true
  }
  if (!Array.isArray(value)) {
    return false
  }
  const partIds = new Set(parts.map((part) => part.id))
  return (
    value.every((area) => isHitArea(area, partIds)) &&
    new Set(value.map((area: PuppetHitArea) => area.id)).size === value.length
  )
}
