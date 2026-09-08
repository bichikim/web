import type {PuppetSkinMatrix} from '../player/document'

export interface WeightedRigidTransform {
  readonly matrix: PuppetSkinMatrix
  readonly weight: number
}

/** Blends planar rigid transforms using normalized dual quaternions. */
export const blendRigidTransforms = (
  transforms: ReadonlyArray<WeightedRigidTransform>,
): PuppetSkinMatrix | undefined => {
  const reference = transforms.reduce<WeightedRigidTransform | undefined>(
    (current, transform) =>
      current === undefined || transform.weight > current.weight ? transform : current,
    undefined,
  )
  if (reference === undefined || reference.weight <= 0) {
    return undefined
  }
  if (transforms.length === 1) {
    return reference.matrix
  }
  const referenceAngle = Math.atan2(reference.matrix.yx, reference.matrix.xx) / 2
  const referenceReal = Math.cos(referenceAngle)
  const referenceImaginary = Math.sin(referenceAngle)
  let real = 0
  let imaginary = 0
  let dualX = 0
  let dualY = 0
  for (const {matrix, weight} of transforms) {
    const angle = Math.atan2(matrix.yx, matrix.xx) / 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const alignedWeight = (cosine * referenceReal + sine * referenceImaginary < 0 ? -1 : 1) * weight
    real += cosine * alignedWeight
    imaginary += sine * alignedWeight
    dualX += ((matrix.x * cosine + matrix.y * sine) * alignedWeight) / 2
    dualY += ((matrix.y * cosine - matrix.x * sine) * alignedWeight) / 2
  }
  const length = Math.hypot(real, imaginary)
  real /= length
  imaginary /= length
  dualX /= length
  dualY /= length
  const cosine = real * real - imaginary * imaginary
  const sine = 2 * real * imaginary
  return {
    xx: cosine,
    xy: -sine,
    yx: sine,
    x: 2 * (dualX * real - dualY * imaginary),
    yy: cosine,
    y: 2 * (dualX * imaginary + dualY * real),
  }
}
