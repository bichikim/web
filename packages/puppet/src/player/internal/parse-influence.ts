import type {PuppetParameter, PuppetParameterInfluence} from '../document'

export const isParameterInfluences = (
  value: unknown,
): value is ReadonlyArray<PuppetParameterInfluence> =>
  Array.isArray(value) &&
  value.every((relation: unknown) => {
    if (
      typeof relation !== 'object' ||
      relation === null ||
      !('parameterId' in relation) ||
      typeof relation.parameterId !== 'string' ||
      !('points' in relation) ||
      !Array.isArray(relation.points) ||
      relation.points.length === 0
    ) {
      return false
    }
    let previous = Number.NEGATIVE_INFINITY
    return relation.points.every((point: unknown) => {
      if (
        typeof point !== 'object' ||
        point === null ||
        !('value' in point) ||
        typeof point.value !== 'number' ||
        !Number.isFinite(point.value) ||
        point.value <= previous ||
        !('weight' in point) ||
        typeof point.weight !== 'number' ||
        !Number.isFinite(point.weight) ||
        point.weight < 0 ||
        point.weight > 1
      ) {
        return false
      }
      previous = point.value
      return true
    })
  }) &&
  new Set(value.map((relation) => relation.parameterId)).size === value.length

export const hasValidInfluences = (
  relations: ReadonlyArray<PuppetParameterInfluence>,
  parameters: ReadonlyArray<PuppetParameter>,
): boolean =>
  relations.every((relation) => {
    const parameter = parameters.find((candidate) => candidate.id === relation.parameterId)
    return (
      parameter !== undefined &&
      relation.points.every(
        (point) => point.value >= parameter.minimum && point.value <= parameter.maximum,
      )
    )
  })
