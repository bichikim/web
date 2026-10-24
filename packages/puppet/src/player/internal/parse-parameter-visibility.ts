import type {PuppetParameter, PuppetParameterVisibility, PuppetScene} from '../document'
import {isFiniteNumber, isRecord} from './parse-primitives'

export const isParameterVisibility = (
  value: unknown,
): value is ReadonlyArray<PuppetParameterVisibility> | undefined =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(
      (range) =>
        isRecord(range) &&
        typeof range.parameterId === 'string' &&
        range.parameterId.length > 0 &&
        isFiniteNumber(range.minimum) &&
        isFiniteNumber(range.maximum) &&
        range.minimum <= range.maximum &&
        (range.precision === undefined ||
          range.precision === 'float32' ||
          range.precision === 'float64'),
    ))

/** Validates the parameter references in all scene visibility intervals. */
export const hasValidParameterVisibility = (
  scene: PuppetScene | undefined,
  parameters: ReadonlyArray<PuppetParameter>,
): boolean => {
  const identifiers = new Set(parameters.map((parameter) => parameter.id))
  const nodes = [...(scene?.roots ?? [])]
  while (nodes.length > 0) {
    const node = nodes.pop()!
    if (node.parameterVisibility?.some((range) => !identifiers.has(range.parameterId)) === true) {
      return false
    }
    if (node.kind !== 'part') {
      nodes.push(...node.children)
    }
  }
  return true
}
