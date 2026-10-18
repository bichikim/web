import {clamp} from 'es-toolkit/math'

interface ProjectCardOptions {
  readonly reversed?: boolean
  readonly width: number
  readonly height: number
  readonly x: number
  readonly y: number
}

const MAXIMUM_YAW = 0.14
const MAXIMUM_PITCH = 0.09
const CAMERA_DISTANCE_RATIO = 2.5
const LAST_CORNER = 3
const UPRIGHT_ORDER = [0, 1, 2, LAST_CORNER] as const
const REVERSED_ORDER = [2, LAST_CORNER, 0, 1] as const

type CardCorners = [number, number, number, number, number, number, number, number]

/** Projects a gently tilted card into its original bounds without cropping. */
export const projectCard = (options: ProjectCardOptions): CardCorners => {
  const yaw = clamp(options.x, -1, 1) * MAXIMUM_YAW
  const pitch = clamp(options.y, -1, 1) * MAXIMUM_PITCH
  const distance = options.height * CAMERA_DISTANCE_RATIO
  const yawCosine = Math.cos(yaw)
  const yawSine = Math.sin(yaw)
  const pitchCosine = Math.cos(pitch)
  const pitchSine = Math.sin(pitch)
  const points = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([horizontal, vertical]) => {
    const x = (horizontal! * options.width) / 2
    const y = (vertical! * options.height) / 2
    const rotatedX = x * yawCosine
    const rotatedY = y * pitchCosine + x * yawSine * pitchSine
    const depth = y * pitchSine - x * yawSine * pitchCosine
    const perspective = distance / (distance - depth)
    return {x: rotatedX * perspective, y: rotatedY * perspective}
  })
  const left = Math.min(...points.map((point) => point.x))
  const right = Math.max(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const bottom = Math.max(...points.map((point) => point.y))
  const scale = Math.min(1, options.width / (right - left), options.height / (bottom - top))
  const centered = points.map((point) => ({
    x: clamp((point.x - (left + right) / 2) * scale + options.width / 2, 0, options.width),
    y: clamp((point.y - (top + bottom) / 2) * scale + options.height / 2, 0, options.height),
  }))
  const order = options.reversed ? REVERSED_ORDER : UPRIGHT_ORDER
  const [first, second, third, fourth] = order.map((index) => centered[index]!)
  return [first!.x, first!.y, second!.x, second!.y, third!.x, third!.y, fourth!.x, fourth!.y]
}
