import {getKeyformPlanes, type KeyformPlane, type PuppetParameterValues} from '../../../deformation'
import type {
  PuppetParameterBinding1D,
  PuppetParameterBinding2D,
  PuppetParameterBinding3D,
} from '../../../player/document'

/** A 3D binding shown as a 2D slice of first/second value points and a track of planes. */
export interface KeyformVolumeViews {
  readonly depth: PuppetParameterBinding1D
  readonly planes: ReadonlyArray<KeyformPlane>
  readonly slice: PuppetParameterBinding2D
}

export const getKeyformVolumeViews = (binding: PuppetParameterBinding3D): KeyformVolumeViews => {
  const planes = getKeyformPlanes(binding)
  return {
    depth: {
      id: binding.id,
      keyforms: planes.map((plane) => ({parts: [], values: [plane.value] as const})),
      parameterIds: [binding.parameterIds[2]],
    },
    planes,
    // Every plane holds the same points, so any plane's points make the slice.
    slice: planes[0]?.binding ?? {
      id: binding.id,
      keyforms: [],
      parameterIds: [binding.parameterIds[0], binding.parameterIds[1]],
    },
  }
}

/** The plane value closest to `value`, the first one on ties; `value` without planes. */
export const getNearestPlaneValue = (planes: ReadonlyArray<KeyformPlane>, value: number) =>
  planes.reduce<number | undefined>(
    (nearest, plane) =>
      nearest === undefined || Math.abs(plane.value - value) < Math.abs(nearest - value)
        ? plane.value
        : nearest,
    undefined,
  ) ?? value

/** `values` when its first/second values are a slice point, else the slice's first point. */
export const getSlicePoint = (
  slice: PuppetParameterBinding2D,
  values: PuppetParameterValues,
): readonly [number, number] => {
  const point = slice.keyforms.find(
    (keyform) => keyform.values[0] === values[0] && keyform.values[1] === values[1],
  )
  const [x, y] = (point ?? slice.keyforms[0])?.values ?? [values[0], values[1] ?? 0]
  return [x, y]
}
