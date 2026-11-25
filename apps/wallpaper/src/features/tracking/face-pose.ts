import {type FacePose, POSE_ROTATION_DEGREES} from './types'

interface FaceCategory {
  readonly categoryName: string
  readonly score: number
}
const HALF_CIRCLE = 180
const DEGREES_PER_RADIAN = HALF_CIRCLE / Math.PI
const ROTATION_RADIANS = POSE_ROTATION_DEGREES / DEGREES_PER_RADIAN
const MATRIX_SIZE = 16
const MINIMUM_BASIS = 0.0001
const MINIMUM_VISIBILITY = 0.2
const bounded = (value: number) =>
  Number.isFinite(value) && value !== 0 ? Math.max(-1, Math.min(1, value)) : 0

/** Reads the column-major canonical-to-camera matrix; X and Z are mirrored for an avatar. */
export const createFacePose = (
  matrix: readonly number[],
  categories: readonly FaceCategory[],
): FacePose | null => {
  if (matrix.length !== MATRIX_SIZE || !matrix.every(Number.isFinite)) {
    return null
  }
  const horizontal = Math.hypot(matrix[0]!, matrix[1]!)
  if (horizontal < MINIMUM_BASIS || Math.hypot(matrix[6]!, matrix[10]!) < MINIMUM_BASIS) {
    return null
  }
  const scores = new Map(
    categories.map(({categoryName, score}) => [categoryName, Math.max(0, bounded(score))]),
  )
  const score = (name: string) => scores.get(name) ?? 0
  const left = 1 - score('eyeBlinkLeft')
  const right = 1 - score('eyeBlinkRight')
  const visibility = left + right
  const eyes =
    visibility < MINIMUM_VISIBILITY
      ? {x: 0, y: 0}
      : {
          x: bounded(
            ((score('eyeLookInLeft') - score('eyeLookOutLeft')) * left +
              (score('eyeLookOutRight') - score('eyeLookInRight')) * right) /
              visibility,
          ),
          y: bounded(
            ((score('eyeLookUpLeft') - score('eyeLookDownLeft')) * left +
              (score('eyeLookUpRight') - score('eyeLookDownRight')) * right) /
              visibility,
          ),
        }
  return {
    eyes,
    head: {
      x: bounded(-Math.atan2(-matrix[2]!, horizontal) / ROTATION_RADIANS),
      y: bounded(-Math.atan2(matrix[6]!, matrix[10]!) / ROTATION_RADIANS),
      z: bounded(-Math.atan2(matrix[1]!, matrix[0]!) / ROTATION_RADIANS),
    },
  }
}
