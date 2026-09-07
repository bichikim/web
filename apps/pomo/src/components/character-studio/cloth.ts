import {z} from 'zod'
const AXES = 3
const CONTACT_STRIDE = 4
const EPSILON = 0.000001
const STRETCH_STIFFNESS = 0.7
const MAX_DISPLACEMENT = 0.012
const MIN_FRAME_RATE = 15
const STEP_RATE = 60
const TIME_EPSILON = 1e-9
const WIND_RATE_X = 2.1
const WIND_FORCE_X = 6
const GRAVITY = 9.81
const WIND_RATE_Z = 1.7
const DAMPING = 0.92
const STEP_SQUARED = 3600
const SHAPE_STIFFNESS = 0.035
const SOLVER_ITERATIONS = 5

const MAX_PARTICLES = 4000
const MAX_EDGES = 40000
const NORMAL_TOLERANCE = 0.001
const schema = z.object({
  contacts: z.array(z.number().finite()).max(MAX_PARTICLES * CONTACT_STRIDE),
  edges: z.array(z.number().int().nonnegative()).max(MAX_EDGES),
  limits: z.record(z.string(), z.number().min(0).max(MAX_DISPLACEMENT)).optional(),
  mobility: z.array(z.number().min(0).max(1)).min(1).max(MAX_PARTICLES),
  positions: z.array(z.number().finite()).max(MAX_PARTICLES * AXES),
})

export interface ClothData {
  readonly limits?: Readonly<Record<string, number>>
  readonly contacts: readonly number[]
  readonly edges: readonly number[]
  readonly mobility: readonly number[]
  readonly positions: readonly number[]
}

export const parseCloth = (value: unknown): ClothData | null => {
  if (typeof value !== 'string') {
    return null
  }
  try {
    const parsed = schema.safeParse(JSON.parse(value))
    if (!parsed.success) {
      return null
    }
    const {data} = parsed
    const count = data.mobility.length
    if (
      data.positions.length !== count * AXES ||
      data.contacts.length !== count * CONTACT_STRIDE ||
      data.edges.length % 2 !== 0 ||
      data.edges.some((index) => index >= count) ||
      data.positions.some((value) => !Number.isFinite(Math.fround(value))) ||
      data.mobility.some((_, index) => {
        const offset = index * CONTACT_STRIDE
        const length = Math.hypot(...data.contacts.slice(offset, offset + AXES))
        return Math.abs(length - 1) > NORMAL_TOLERANCE || data.contacts[offset + AXES] < 0
      })
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export const createCloth = (data: ClothData) => {
  const positions = Float32Array.from(data.positions)
  const previous = positions.slice()
  const lengths: number[] = []
  let accumulator = 0
  let time = 0
  for (let index = 0; index < data.edges.length; index += 2) {
    const first = data.edges[index] * AXES
    const second = data.edges[index + 1] * AXES
    lengths.push(
      Math.hypot(...[0, 1, 2].map((axis) => positions[first + axis] - positions[second + axis])),
    )
  }

  const constrain = () => {
    for (let index = 0; index < data.edges.length; index += 2) {
      const first = data.edges[index]
      const second = data.edges[index + 1]
      const weight = data.mobility[first] + data.mobility[second]
      const horizontal = positions[first * AXES] - positions[second * AXES]
      const vertical = positions[first * AXES + 1] - positions[second * AXES + 1]
      const depth = positions[first * AXES + 2] - positions[second * AXES + 2]
      const distance = Math.hypot(horizontal, vertical, depth)
      if (weight > 0 && distance > EPSILON) {
        const correction = ((distance - lengths[index / 2]) / distance / weight) * STRETCH_STIFFNESS
        for (const [axis, delta] of [horizontal, vertical, depth].entries()) {
          positions[first * AXES + axis] -= delta * correction * data.mobility[first]
          positions[second * AXES + axis] += delta * correction * data.mobility[second]
        }
      }
    }
    for (let index = 0; index < data.mobility.length; index += 1) {
      const offset = index * AXES
      let distance = 0
      for (let axis = 0; axis < AXES; axis += 1) {
        distance += (positions[offset + axis] - data.positions[offset + axis]) ** 2
      }
      const scale = Math.min(
        1,
        (MAX_DISPLACEMENT * data.mobility[index]) / Math.max(Math.sqrt(distance), EPSILON),
      )
      let contact = data.contacts[index * CONTACT_STRIDE + AXES]
      for (let axis = 0; axis < AXES; axis += 1) {
        positions[offset + axis] =
          data.positions[offset + axis] +
          (positions[offset + axis] - data.positions[offset + axis]) * scale
        contact +=
          (positions[offset + axis] - data.positions[offset + axis]) *
          data.contacts[index * CONTACT_STRIDE + axis]
      }
      if (contact < 0) {
        for (let axis = 0; axis < AXES; axis += 1) {
          positions[offset + axis] -= contact * data.contacts[index * CONTACT_STRIDE + axis]
        }
      }
    }
  }

  return {
    advance: (elapsed: number, wind: number) => {
      if (!Number.isFinite(elapsed) || elapsed <= 0) {
        return
      }
      accumulator += Math.min(elapsed, 1 / MIN_FRAME_RATE)
      while (accumulator + TIME_EPSILON >= 1 / STEP_RATE) {
        accumulator -= 1 / STEP_RATE
        time += 1 / STEP_RATE
        const force = [
          Math.sin(time * WIND_RATE_X) * wind * WIND_FORCE_X,
          -GRAVITY,
          Math.cos(time * WIND_RATE_Z) * wind * CONTACT_STRIDE,
        ]
        for (let index = 0; index < positions.length; index += 1) {
          const current = positions[index]
          const mobility = data.mobility[Math.floor(index / AXES)]
          positions[index] +=
            ((current - previous[index]) * DAMPING +
              force[index % AXES] / STEP_SQUARED -
              (current - data.positions[index]) * SHAPE_STIFFNESS) *
            mobility
          previous[index] = current
        }
        for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
          constrain()
        }
      }
    },
    positions,
    reset: () => {
      positions.set(data.positions)
      previous.set(data.positions)
      accumulator = 0
      time = 0
    },
  }
}
