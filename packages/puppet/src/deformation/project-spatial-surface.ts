import type {PuppetSpatialSurface} from '../player/document'

const DEGREES_PER_HALF_ROTATION = 180
const COORDINATES_PER_POINT = 3

export interface ProjectSpatialSurfaceOptions {
  readonly surface: PuppetSpatialSurface
  readonly rotation: readonly [number, number, number]
  readonly scale?: readonly [number, number, number]
  readonly translation?: readonly [number, number, number]
}

export interface SpatialProjection {
  readonly depths: ReadonlyArray<number>
  readonly vertices: ReadonlyArray<number>
}

/** Scales and rotates XYZ control points about the shared origin, then translates them. */
export const projectSpatialSurface = (options: ProjectSpatialSurfaceOptions): SpatialProjection => {
  const [originX, originY, originZ] = options.surface.origin
  const [scaleX, scaleY, scaleZ] = options.scale ?? [1, 1, 1]
  const [translationX, translationY, translationZ] = options.translation ?? [0, 0, 0]
  const [angleX, angleY, angleZ] = options.rotation.map(
    (degrees) => (degrees * Math.PI) / DEGREES_PER_HALF_ROTATION,
  )
  const cosineX = Math.cos(angleX!)
  const sineX = Math.sin(angleX!)
  const cosineY = Math.cos(angleY!)
  const sineY = Math.sin(angleY!)
  const cosineZ = Math.cos(angleZ!)
  const sineZ = Math.sin(angleZ!)
  const projected: number[] = []
  const depths: number[] = []

  for (
    let index = 0;
    index < options.surface.controlPoints.length;
    index += COORDINATES_PER_POINT
  ) {
    const x = (options.surface.controlPoints[index]! - originX) * scaleX
    const y = (options.surface.controlPoints[index + 1]! - originY) * scaleY
    const z = (options.surface.controlPoints[index + 2]! - originZ) * scaleZ
    const rotatedY = y * cosineX - z * sineX
    const rotatedZ = y * sineX + z * cosineX
    const turnedX = x * cosineY + rotatedZ * sineY
    const turnedZ = -x * sineY + rotatedZ * cosineY
    projected.push(
      originX + turnedX * cosineZ - rotatedY * sineZ + translationX,
      originY + turnedX * sineZ + rotatedY * cosineZ + translationY,
    )
    depths.push(originZ + turnedZ + translationZ)
  }

  return {depths, vertices: projected}
}
