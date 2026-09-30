import {OrthographicCamera, Vector3} from 'three'

export type SpatialGizmoAxis = 'x' | 'y' | 'z'

export interface SpatialGizmoPoint {
  readonly x: number
  readonly y: number
}

export interface SpatialGizmoHandle {
  readonly axis: SpatialGizmoAxis
  readonly end: SpatialGizmoPoint
  readonly movePath: string
  readonly rotatePath: string
}

export interface SpatialPreviewGizmo {
  readonly center: SpatialGizmoPoint
  readonly handles: ReadonlyArray<SpatialGizmoHandle>
  readonly height: number
  readonly width: number
  readonly worldLength: number
}

type AxisVector = readonly [number, number, number]

const MOVE_LENGTH_PIXELS = 64
const ROTATE_RADIUS_PIXELS = 48
const ARROW_HEAD_LENGTH = 10
const ARROW_HEAD_HALF_WIDTH = 5
const RING_SEGMENTS = 48
const CLIP_BOUND = 1
const AXES: ReadonlyArray<{
  axis: SpatialGizmoAxis
  direction: AxisVector
  ringFirst: AxisVector
  ringSecond: AxisVector
}> = [
  {axis: 'x', direction: [1, 0, 0], ringFirst: [0, -1, 0], ringSecond: [0, 0, 1]},
  {axis: 'y', direction: [0, -1, 0], ringFirst: [1, 0, 0], ringSecond: [0, 0, 1]},
  {axis: 'z', direction: [0, 0, 1], ringFirst: [1, 0, 0], ringSecond: [0, -1, 0]},
]

const screenPoint = (
  world: Vector3,
  camera: OrthographicCamera,
  width: number,
  height: number,
): SpatialGizmoPoint => {
  const projected = world.project(camera)
  return {x: ((projected.x + 1) * width) / 2, y: ((1 - projected.y) * height) / 2}
}

const arrowPath = (center: SpatialGizmoPoint, end: SpatialGizmoPoint) => {
  const dx = end.x - center.x
  const dy = end.y - center.y
  const length = Math.hypot(dx, dy)
  if (length < ARROW_HEAD_LENGTH) {
    return `M ${center.x} ${center.y} L ${end.x} ${end.y}`
  }
  const unitX = dx / length
  const unitY = dy / length
  const baseX = end.x - unitX * ARROW_HEAD_LENGTH
  const baseY = end.y - unitY * ARROW_HEAD_LENGTH
  return [
    `M ${center.x} ${center.y} L ${end.x} ${end.y}`,
    `M ${baseX - unitY * ARROW_HEAD_HALF_WIDTH} ${baseY + unitX * ARROW_HEAD_HALF_WIDTH}`,
    `L ${end.x} ${end.y}`,
    `L ${baseX + unitY * ARROW_HEAD_HALF_WIDTH} ${baseY - unitX * ARROW_HEAD_HALF_WIDTH}`,
  ].join(' ')
}

interface RingOptions {
  readonly center: Vector3
  readonly first: AxisVector
  readonly second: AxisVector
  readonly radius: number
  readonly camera: OrthographicCamera
  readonly width: number
  readonly height: number
}

const ringPath = ({center, first, second, radius, camera, width, height}: RingOptions) =>
  Array.from({length: RING_SEGMENTS + 1}, (_, index) => {
    const angle = (index * Math.PI * 2) / RING_SEGMENTS
    const point = center
      .clone()
      .addScaledVector(new Vector3(...first), Math.cos(angle) * radius)
      .addScaledVector(new Vector3(...second), Math.sin(angle) * radius)
    const screen = screenPoint(point, camera, width, height)
    return `${index === 0 ? 'M' : 'L'} ${screen.x} ${screen.y}`
  }).join(' ')

/** Projects world axes and rotation rings around a selected primitive's center. */
export const projectSpatialPreviewGizmo = (
  pivot: readonly [number, number, number] | undefined,
  camera: OrthographicCamera,
  width: number,
  height: number,
): SpatialPreviewGizmo | undefined => {
  if (pivot === undefined) {
    return undefined
  }
  const origin = new Vector3(pivot[0], -pivot[1], pivot[2])
  const clip = origin.clone().project(camera)
  if (
    Math.abs(clip.x) > CLIP_BOUND ||
    Math.abs(clip.y) > CLIP_BOUND ||
    Math.abs(clip.z) > CLIP_BOUND
  ) {
    return undefined
  }
  const center = screenPoint(origin.clone(), camera, width, height)
  const unitsPerPixel = (camera.top - camera.bottom) / height
  const worldLength = MOVE_LENGTH_PIXELS * unitsPerPixel
  const ringRadius = ROTATE_RADIUS_PIXELS * unitsPerPixel
  const handles = AXES.map(({axis, direction, ringFirst, ringSecond}) => {
    const end = screenPoint(
      origin.clone().addScaledVector(new Vector3(...direction), worldLength),
      camera,
      width,
      height,
    )
    return {
      axis,
      end,
      movePath: arrowPath(center, end),
      rotatePath: ringPath({
        camera,
        center: origin,
        first: ringFirst,
        height,
        radius: ringRadius,
        second: ringSecond,
        width,
      }),
    }
  })
  return {center, handles, height, width, worldLength}
}
