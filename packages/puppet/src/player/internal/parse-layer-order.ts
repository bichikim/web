import type {PuppetLayerOrderRule, PuppetParameter, PuppetPart} from '../document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasKnownIds = (
  value: unknown,
  knownIds: ReadonlySet<string>,
): value is ReadonlyArray<string> =>
  Array.isArray(value) &&
  value.length > 0 &&
  new Set(value).size === value.length &&
  value.every((id) => typeof id === 'string' && knownIds.has(id))

const isLayerOrderRule = (
  value: unknown,
  partIds: ReadonlySet<string>,
  parameterIds: ReadonlySet<string>,
): value is PuppetLayerOrderRule =>
  isRecord(value) &&
  hasKnownIds(value.partIds, partIds) &&
  typeof value.referencePartId === 'string' &&
  partIds.has(value.referencePartId) &&
  !value.partIds.includes(value.referencePartId) &&
  (value.placement === 'before' || value.placement === 'after') &&
  isRecord(value.when) &&
  hasKnownIds(value.when.parameterIds, parameterIds) &&
  (value.when.comparison === 'greater-than' || value.when.comparison === 'less-than') &&
  typeof value.when.threshold === 'number' &&
  Number.isFinite(value.when.threshold)

export const hasValidLayerOrderRules = (
  value: unknown,
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
): value is ReadonlyArray<PuppetLayerOrderRule> | undefined => {
  if (value === undefined) {
    return true
  }
  if (!Array.isArray(value)) {
    return false
  }

  const partIds = new Set(parts.map((part) => part.id))
  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  return value.every((rule) => isLayerOrderRule(rule, partIds, parameterIds))
}
