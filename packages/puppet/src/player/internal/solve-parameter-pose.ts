export interface ParameterPose {
  readonly x: number
  readonly y: number
  readonly angle: number
}
interface JointParameter {
  readonly id: string
  readonly minimum: number
  readonly maximum: number
  readonly defaultValue: number
}
interface SolveParameterPoseOptions {
  readonly mobility?: readonly number[]
  readonly parameters: readonly JointParameter[]
  readonly values: Readonly<Record<string, number>>
  readonly sample: (values: Readonly<Record<string, number>>) => ParameterPose
  readonly target: ParameterPose
  /** Document distance representing one radian of part rotation. */
  readonly angleScale: number
  readonly tolerance?: number
}
type Vector = readonly [number, number, number]
const MINIMUM_DAMPING = 1e-12
const DAMPING_RATIO = 0.00001
const LINE_SEARCH_STEPS = 4
const STEP_FRACTIONS = Array.from({length: LINE_SEARCH_STEPS}, (_, index) => 2 ** -index)
const BEND_SEED = 0.04
const BEND_SEEDS = [-BEND_SEED, BEND_SEED] as const
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
const dot = (left: Vector, right: Vector) =>
  left.reduce((sum, value, index) => sum + value * right[index]!, 0)
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const bendDirection = (columns: readonly Vector[]): readonly number[] => {
  const candidates = columns.map((column, index) => {
    const projection = solveNormal(columns, column)
    return columns.map(
      (candidate, position) => (index === position ? 1 : 0) - dot(candidate, projection),
    )
  })
  const magnitude = (values: readonly number[]) =>
    Math.max(MINIMUM_DAMPING, ...values.map(Math.abs))
  const best = candidates.reduce(
    (selected, candidate) => (magnitude(candidate) > magnitude(selected) ? candidate : selected),
    columns.map(() => 0),
  )
  const scale = magnitude(best)
  return best.map((value) => value / scale)
}

/** A damped 3D normal system stays invertible when a straight chain loses one direction. */
const solveNormal = (columns: readonly Vector[], error: Vector): Vector => {
  const damping = Math.max(
    MINIMUM_DAMPING,
    columns.reduce((sum, column) => sum + dot(column, column), 0) * DAMPING_RATIO,
  )
  const cell = (row: number, column: number) =>
    columns.reduce((sum, vector) => sum + vector[row]! * vector[column]!, 0) +
    (row === column ? damping : 0)
  const xx = cell(0, 0)
  const xy = cell(0, 1)
  const xa = cell(0, 2)
  const yy = cell(1, 1)
  const ya = cell(1, 2)
  const zz = cell(2, 2)
  const aa = yy * zz - ya * ya
  const bb = xa * ya - xy * zz
  const cc = xy * ya - xa * yy
  const dd = xx * zz - xa * xa
  const ee = xy * xa - xx * ya
  const ff = xx * yy - xy * xy
  const determinant = xx * aa + xy * bb + xa * cc
  return [
    (aa * error[0] + bb * error[1] + cc * error[2]) / determinant,
    (bb * error[0] + dd * error[1] + ee * error[2]) / determinant,
    (cc * error[0] + ee * error[1] + ff * error[2]) / determinant,
  ]
}

interface PoseState {
  readonly coordinates: readonly number[]
  readonly error: Vector
  readonly pose: ParameterPose
  readonly score: number
}
interface RefinePoseOptions {
  readonly mobility: readonly number[]
  readonly coordinates: readonly number[]
  readonly sample: (coordinates: readonly number[]) => ParameterPose
  readonly residual: (pose: ParameterPose) => Vector
  readonly angleScale: number
  readonly tolerance: number
}
const refinePose = (options: RefinePoseOptions): PoseState => {
  const {sample, residual, angleScale, tolerance, mobility} = options
  let {coordinates} = options
  let pose = sample(coordinates)
  let error = residual(pose)
  const MAXIMUM_ITERATIONS = 32
  const DIFFERENCE = 0.001
  const MAXIMUM_STEP = 0.15
  for (let iteration = 0; iteration < MAXIMUM_ITERATIONS; iteration += 1) {
    const currentCoordinates = coordinates
    const currentPose = pose
    const columns = currentCoordinates.map((coordinate, index): Vector => {
      const next = [...currentCoordinates]
      next[index] = clamp(
        coordinate + (coordinate > 1 - DIFFERENCE ? -DIFFERENCE : DIFFERENCE),
        0,
        1,
      )
      const difference = next[index]! - coordinate
      const moved = sample(next)
      return [
        (moved.x - currentPose.x) / difference,
        (moved.y - currentPose.y) / difference,
        (wrapAngle(moved.angle - currentPose.angle) * angleScale) / difference,
      ]
    })
    // Mobility weights joint costs in the damped solve; zero mobility fixes that joint.
    const weighted = columns.map((column, index): Vector => {
      const weight = Math.sqrt(mobility[index]!)
      return [column[0] * weight, column[1] * weight, column[2] * weight]
    })
    const direction = solveNormal(weighted, error)
    const steps = columns.map((column, index) => dot(column, direction) * mobility[index]!)
    const scale = Math.min(1, MAXIMUM_STEP / Math.max(...steps.map(Math.abs)))
    const candidates = STEP_FRACTIONS.map((fraction) =>
      currentCoordinates.map((value, index) =>
        clamp(value + steps[index]! * scale * fraction, 0, 1),
      ),
    )
    // A perfectly straight chain needs a small bend before an inward target has a gradient.
    if (iteration === 0 && coordinates.length > 1) {
      const bend = bendDirection(columns)
      candidates.push(
        ...BEND_SEEDS.map((amount) =>
          currentCoordinates.map((value, index) =>
            clamp(value + (mobility[index]! > 0 ? bend[index]! * amount : 0), 0, 1),
          ),
        ),
      )
    }
    const currentScore = dot(error, error)
    const best = candidates
      .map((candidate) => {
        const sampled = sample(candidate)
        const remaining = residual(sampled)
        return {
          coordinates: candidate,
          error: remaining,
          pose: sampled,
          score: dot(remaining, remaining),
        }
      })
      .reduce((closest, candidate) => (candidate.score < closest.score ? candidate : closest), {
        coordinates,
        error,
        pose,
        score: currentScore,
      })
    if (best.score >= currentScore || best.score <= tolerance) {
      return best
    }
    ;({coordinates, error, pose} = best)
  }
  return {coordinates, error, pose, score: dot(error, error)}
}

/** Fits the existing keyed rig; it changes joint inputs, never bone lengths or mesh topology. */
export const solveParameterPose = (
  options: SolveParameterPoseOptions,
): Readonly<Record<string, number>> => {
  const {parameters, sample, target, angleScale} = options
  const mobility = parameters.map((_, index) => {
    const weight = options.mobility?.[index] ?? 1
    return Number.isFinite(weight) ? clamp(weight, 0, 1) : 0
  })
  if (![target.x, target.y, target.angle, angleScale].every(Number.isFinite)) {
    return options.values
  }
  const valuesAt = (coordinates: readonly number[]) => ({
    ...options.values,
    ...Object.fromEntries(
      parameters.map((parameter, index) => [
        parameter.id,
        parameter.minimum + coordinates[index]! * (parameter.maximum - parameter.minimum),
      ]),
    ),
  })
  const residual = (pose: ParameterPose): Vector => [
    target.x - pose.x,
    target.y - pose.y,
    wrapAngle(target.angle - pose.angle) * angleScale,
  ]
  const coordinates = parameters.map((parameter) =>
    clamp(
      ((options.values[parameter.id] ?? parameter.defaultValue) - parameter.minimum) /
        (parameter.maximum - parameter.minimum),
      0,
      1,
    ),
  )
  const pose = sample(valuesAt(coordinates))
  const error = residual(pose)
  const DEFAULT_TOLERANCE = 0.000001
  const tolerance = (options.tolerance ?? DEFAULT_TOLERANCE) ** 2
  if (dot(error, error) <= tolerance) {
    return options.values
  }
  const sampleAt = (input: readonly number[]) => sample(valuesAt(input))
  const refine = (input: readonly number[]) =>
    refinePose({angleScale, coordinates: input, mobility, residual, sample: sampleAt, tolerance})
  const first = refine(coordinates)
  if (first.score <= tolerance) {
    return valuesAt(first.coordinates)
  }
  // Joint limits can trap the opposite bend. Try both orientations before accepting a limit.
  const DIFFERENCE = 0.001
  const columns = coordinates.map((coordinate, index): Vector => {
    const moved = [...coordinates]
    moved[index] = clamp(
      coordinate + (coordinate > 1 - DIFFERENCE ? -DIFFERENCE : DIFFERENCE),
      0,
      1,
    )
    const difference = moved[index]! - coordinate
    const next = sampleAt(moved)
    return [
      (next.x - pose.x) / difference,
      (next.y - pose.y) / difference,
      (wrapAngle(next.angle - pose.angle) * angleScale) / difference,
    ]
  })
  const bend = bendDirection(columns)
  const RETRY_BEND = 0.3
  const retries = [-RETRY_BEND, RETRY_BEND].map((amount) =>
    refine(
      coordinates.map((value, index) =>
        clamp(value + (mobility[index]! > 0 ? bend[index]! * amount : 0), 0, 1),
      ),
    ),
  )
  const best = retries.reduce(
    (closest, candidate) => (candidate.score < closest.score ? candidate : closest),
    first,
  )
  return valuesAt(best.coordinates)
}
