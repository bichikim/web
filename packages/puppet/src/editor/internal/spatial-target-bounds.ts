import type {PuppetPart, PuppetSpatialPrimitiveObject} from '../../player'

export interface SpatialTargetBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const EMPTY_POSITION = [0, 0, 0] as const
const MIN_SHAPE_SIZE = 0.01

/** Returns the image-vertex extent that the spatial mesh must cover. */
export const getSpatialTargetBounds = (
  parts: ReadonlyArray<PuppetPart>,
  fallback: SpatialTargetBounds,
): SpatialTargetBounds => {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const part of parts) {
    for (let index = 0; index < part.mesh.vertices.length; index += 2) {
      const x = part.mesh.vertices[index]!
      const y = part.mesh.vertices[index + 1]!
      if (Number.isFinite(x) && Number.isFinite(y)) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }
  if (!Number.isFinite(left)) {
    return fallback
  }
  return {height: bottom - top, width: right - left, x: left, y: top}
}

/** Converts a stored primitive center to an offset from the target image center. */
export const getTargetRelativeCenter = (
  center: readonly [number, number, number],
  bounds: SpatialTargetBounds,
  meshPosition: readonly [number, number, number] = EMPTY_POSITION,
): [number, number, number] => [
  center[0] + meshPosition[0] - (bounds.x + bounds.width / 2),
  center[1] + meshPosition[1] - (bounds.y + bounds.height / 2),
  center[2] + meshPosition[2],
]

/** Locates a primitive at the target center before the mesh position is applied. */
export const getTargetAlignedCenter = (
  bounds: SpatialTargetBounds,
  meshPosition: readonly [number, number, number] = EMPTY_POSITION,
): [number, number, number] => [
  bounds.x + bounds.width / 2 - meshPosition[0],
  bounds.y + bounds.height / 2 - meshPosition[1],
  -meshPosition[2],
]

/** Fits a primitive's XY extent to the linked images while retaining its depth and identity. */
export const fitSpatialPrimitiveToTarget = (
  object: PuppetSpatialPrimitiveObject,
  bounds: SpatialTargetBounds,
  meshPosition: readonly [number, number, number] = EMPTY_POSITION,
): PuppetSpatialPrimitiveObject => ({
  ...object,
  center: getTargetAlignedCenter(bounds, meshPosition),
  rotation: [0, 0, 0],
  size: [
    Math.max(bounds.width, MIN_SHAPE_SIZE),
    Math.max(bounds.height, MIN_SHAPE_SIZE),
    object.size[2],
  ],
})
