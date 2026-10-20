import {
  isThreeDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../deformation'
import type {PuppetParameterBinding} from '../../player/document'

const PLANE_AXIS = 2

/** Orders keyform values by the last parameter first, like the editor stores them. */
export const compareKeyformValues = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.reduceRight(
    (order, value, index) => order || value - (second[index] ?? 0),
    first.length - second.length,
  )

/** `values` as a binding value tuple, padded with zeros up to three parameters. */
export const toParameterValues = (
  values: ReadonlyArray<number>,
  count: number,
): PuppetParameterValues => {
  const at = (index: number) => values[index] ?? 0
  if (count >= PLANE_AXIS + 1) {
    return [at(0), at(1), at(PLANE_AXIS)]
  }
  return count === PLANE_AXIS ? [at(0), at(1)] : [at(0)]
}

const samePoint = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first[0] === second[0] && first[1] === second[1]

const getPlaneValues = (binding: PuppetParameterBinding) => [
  ...new Set(binding.keyforms.map((keyform) => keyform.values[PLANE_AXIS] ?? 0)),
]

/** A 3D binding's third values, increasing. */
export const getKeyformPlaneValues = (binding: PuppetParameterBinding) =>
  getPlaneValues(binding).toSorted((first, second) => first - second)

/** Whether removing `value` from the third parameter leaves a 3D binding a plane. */
export const canDeleteKeyformPlane = (binding: PuppetParameterBinding, value: number) =>
  isThreeDimensionalParameterBinding(binding) &&
  binding.keyforms.some((keyform) => keyform.values[PLANE_AXIS] === value) &&
  binding.keyforms.some((keyform) => keyform.values[PLANE_AXIS] !== value)

/** 현재 단면의 XY 키폼 하나 또는 같은 XY를 유지하는 Z 단면 전체를 이동한다. */
export const getKeyformMove = (
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
  nextValues: PuppetParameterValues,
): ((keyform: ReadonlyArray<number>) => ReadonlyArray<number>) | undefined => {
  if (!isThreeDimensionalParameterBinding(binding)) {
    return (keyform) => (parameterValuesEqual(keyform, values) ? nextValues : keyform)
  }
  const plane = values[PLANE_AXIS]
  const nextPlane = nextValues[PLANE_AXIS]
  if (samePoint(values, nextValues)) {
    if (
      plane !== nextPlane &&
      binding.keyforms.some((keyform) => keyform.values[PLANE_AXIS] === nextPlane)
    ) {
      return undefined
    }
    return (keyform) =>
      keyform[PLANE_AXIS] === plane ? [keyform[0] ?? 0, keyform[1] ?? 0, nextPlane ?? 0] : keyform
  }
  return plane === nextPlane
    ? (keyform) =>
        parameterValuesEqual(keyform, values)
          ? [nextValues[0], nextValues[1] ?? 0, keyform[PLANE_AXIS] ?? 0]
          : keyform
    : undefined
}
