type Point3 = readonly [number, number, number]

const DEGREES_PER_HALF_ROTATION = 180

/** Rotates a local 3D point through the X, Y, then Z axes. */
export const rotateSpatialPoint = (point: Point3, rotation: Point3): Point3 => {
  const [angleX, angleY, angleZ] = rotation.map(
    (angle) => (angle * Math.PI) / DEGREES_PER_HALF_ROTATION,
  )
  const pitchedY = point[1] * Math.cos(angleX!) - point[2] * Math.sin(angleX!)
  const pitchedZ = point[1] * Math.sin(angleX!) + point[2] * Math.cos(angleX!)
  const turnedX = point[0] * Math.cos(angleY!) + pitchedZ * Math.sin(angleY!)
  const turnedZ = -point[0] * Math.sin(angleY!) + pitchedZ * Math.cos(angleY!)
  return [
    turnedX * Math.cos(angleZ!) - pitchedY * Math.sin(angleZ!),
    turnedX * Math.sin(angleZ!) + pitchedY * Math.cos(angleZ!),
    turnedZ,
  ]
}

/** Rotates a positioned 3D point around the supplied center. */
export const placeRotatedSpatialPoint = (
  point: Point3,
  center: Point3,
  rotation: Point3,
): Point3 => {
  const [x, y, z] = point
  const [centerX, centerY, centerZ] = center
  const [turnedX, turnedY, turnedZ] = rotateSpatialPoint(
    [x - centerX, y - centerY, z - centerZ],
    rotation,
  )
  return [centerX + turnedX, centerY + turnedY, centerZ + turnedZ]
}
