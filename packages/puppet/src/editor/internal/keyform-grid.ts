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

const getPlanePoints = (binding: PuppetParameterBinding) => {
  const [plane] = getPlaneValues(binding)
  return binding.keyforms.flatMap((keyform) =>
    keyform.values[PLANE_AXIS] === plane ? [[keyform.values[0], keyform.values[1] ?? 0]] : [],
  )
}

/** Whether every plane along the third value holds the same first/second value points. */
export const isCompleteKeyformGrid = (
  keyforms: ReadonlyArray<{readonly values: ReadonlyArray<number>}>,
) => {
  const signature = (plane: number | undefined) =>
    keyforms
      .filter((keyform) => keyform.values[PLANE_AXIS] === plane)
      .map((keyform) => `${keyform.values[0]}:${keyform.values[1]}`)
      .toSorted()
      .join(',')
  const [first, ...rest] = [...new Set(keyforms.map((keyform) => keyform.values[PLANE_AXIS]))].map(
    signature,
  )
  return rest.every((plane) => plane === first)
}

/** A 3D binding's third values, increasing. */
export const getKeyformPlaneValues = (binding: PuppetParameterBinding) =>
  getPlaneValues(binding).toSorted((first, second) => first - second)

/**
 * The keyform values that adding `values` creates. A 3D binding stays a complete grid: a new
 * point appears in every plane and a new plane holds every point.
 */
export const getInsertedKeyformValues = (
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
): ReadonlyArray<PuppetParameterValues> => {
  if (!isThreeDimensionalParameterBinding(binding) || binding.keyforms.length === 0) {
    return [values]
  }
  const [x, y, z] = values as readonly [number, number, number]
  const points = getPlanePoints(binding)
  const planes = getPlaneValues(binding)
  const allPoints = points.some((point) => samePoint(point, values)) ? points : [...points, [x, y]]
  const allPlanes = planes.includes(z) ? planes : [...planes, z]
  return allPlanes.flatMap((plane) =>
    allPoints.flatMap(([pointX = 0, pointY = 0]) =>
      binding.keyforms.some((keyform) =>
        parameterValuesEqual(keyform.values, [pointX, pointY, plane]),
      )
        ? []
        : [[pointX, pointY, plane] as const],
    ),
  )
}

/** Whether deleting `values` removes `keyform`: a 3D binding loses the point in every plane. */
export const isDeletedKeyform = (
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
  keyform: ReadonlyArray<number>,
) =>
  isThreeDimensionalParameterBinding(binding)
    ? samePoint(keyform, values)
    : parameterValuesEqual(keyform, values)

/** Whether removing `value` from the third parameter leaves a 3D binding a plane. */
export const canDeleteKeyformPlane = (binding: PuppetParameterBinding, value: number) =>
  isThreeDimensionalParameterBinding(binding) &&
  binding.keyforms.some((keyform) => keyform.values[PLANE_AXIS] === value) &&
  binding.keyforms.some((keyform) => keyform.values[PLANE_AXIS] !== value)

/**
 * How moving the keyform at `values` to `nextValues` rewrites each keyform's values. A 3D
 * binding moves a point in every plane, or a whole plane, but not both at once.
 */
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
    return (keyform) =>
      keyform[PLANE_AXIS] === plane ? [keyform[0] ?? 0, keyform[1] ?? 0, nextPlane ?? 0] : keyform
  }
  return plane === nextPlane
    ? (keyform) =>
        samePoint(keyform, values)
          ? [nextValues[0], nextValues[1] ?? 0, keyform[PLANE_AXIS] ?? 0]
          : keyform
    : undefined
}
