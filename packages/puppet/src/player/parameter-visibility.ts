import type {PuppetDocument, PuppetSceneNodeBase} from './document'
import {resolveParameterValue} from './parameter-value'

/** Resolves static visibility and all mapped parameter intervals, including document defaults. */
export const isParameterVisible = (
  node: PuppetSceneNodeBase,
  document: PuppetDocument,
  values?: Readonly<Record<string, number>>,
): boolean =>
  node.visible &&
  (node.parameterVisibility ?? []).every((range) => {
    const parameter = document.parameters?.find((candidate) => candidate.id === range.parameterId)
    if (parameter === undefined) {
      return false
    }
    const value = resolveParameterValue(parameter, values?.[parameter.id])
    const input = range.precision === 'float32' ? Math.fround(value) : value
    return input >= range.minimum && input <= range.maximum
  })
