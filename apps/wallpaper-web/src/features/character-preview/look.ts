import type {Player} from '@winter-love/puppet/player'
import {smoothTrackingPoint} from '@winter-love/wallpaper/tracking/smooth-point'
import type {TrackingPoint} from '@winter-love/wallpaper/tracking/types'

interface LookParameter {
  readonly id: string
  readonly minimum: number
  readonly maximum: number
  readonly defaultValue: number
}
interface CharacterLookFrames {
  /** Schedules a frame with a monotonic timestamp in milliseconds. */
  readonly request: (callback: FrameRequestCallback) => number
  /** Cancels this connection's pending frame. */
  readonly cancel: (handle: number) => void
}
interface ConnectCharacterLookOptions {
  /** Borrowed player; only this connection's four gaze blends are changed or released. */
  readonly player: Pick<Player, 'patchParameterBlends'>
  /** Model limits used as the full movement endpoints. */
  readonly parameters: readonly LookParameter[]
  /** Borrowed frame scheduler; no work is scheduled once the target is reached. */
  readonly frames: CharacterLookFrames
}
const AXES = [
  {axis: 'x', id: 'ParamAngleX'},
  {axis: 'y', id: 'ParamAngleY'},
  {axis: 'x', id: 'ParamEyeBallX'},
  {axis: 'y', id: 'ParamEyeBallY'},
] as const
const FRAMES_PER_SECOND = 60
const FRAME_SECONDS = 1 / FRAMES_PER_SECOND
const MILLISECONDS_PER_SECOND = 1000

/** Adds smoothed full-range gaze to animation; exit releases only the tracking contribution. */
export const connectCharacterLook = (options: ConnectCharacterLookOptions) => {
  const axes = AXES.flatMap((axis) => {
    const parameter = options.parameters.find((parameter) => parameter.id === axis.id)
    return parameter === undefined ? [] : [{...axis, parameter}]
  })
  let current: TrackingPoint = {x: 0, y: 0}
  let target: TrackingPoint | null = null
  let previous: number | null = null
  let frame = 0
  const step = (timestamp: number) => {
    frame = 0
    if (target === null) {
      return
    }
    const seconds =
      previous === null ? FRAME_SECONDS : (timestamp - previous) / MILLISECONDS_PER_SECOND
    previous = timestamp
    current = smoothTrackingPoint(current, target, seconds)
    options.player.patchParameterBlends(
      Object.fromEntries(
        axes.map(({id, axis, parameter}) => {
          const direction = current[axis]
          const endpoint = direction < 0 ? parameter.minimum : parameter.maximum
          const value = (endpoint - parameter.defaultValue) * Math.abs(direction)
          return [id, {mode: 'add' as const, value}]
        }),
      ),
    )
    if (current.x !== target.x || current.y !== target.y) {
      frame = options.frames.request(step)
    } else {
      previous = null
    }
  }
  const follow = (point: TrackingPoint) => {
    if (point.x === target?.x && point.y === target?.y) {
      return
    }
    target = point
    if (frame === 0) {
      frame = options.frames.request(step)
    }
  }
  const release = () => {
    options.frames.cancel(frame)
    frame = 0
    target = null
    previous = null
    current = {x: 0, y: 0}
    options.player.patchParameterBlends(Object.fromEntries(axes.map(({id}) => [id, undefined])))
  }
  return {follow, release}
}
