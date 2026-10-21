import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebview} from '@tauri-apps/api/webview'
import type {Player} from '@winter-love/puppet/player'
import {
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {createTrackingCenters, createTrackingParameters} from './parameters'
import {smoothTrackingPoint} from './smooth-point'
import type {
  CameraSurface,
  CursorPosition,
  FacePosition,
  TrackingParameter,
  TrackingPoint,
} from './types'
import {cameraTrackingPoints} from './camera-points'
import {canvasCameraSurface} from './canvas-camera-surface'
import {useViewport} from './use-viewport'

interface UseTrackingProps {
  readonly mode: Accessor<PoffoTracking>
  readonly bindings: Accessor<PoffoTrackingBindings | undefined>
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly options?: Accessor<PoffoTrackingOptions | undefined>
  readonly player: Accessor<Player | null>
  readonly parameters: Accessor<readonly TrackingParameter[]>
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly onError: (cause: unknown) => void
}
const bounded = (value: number) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0)
const FRAMES_PER_SECOND = 60
const FRAME_SECONDS = 1 / FRAMES_PER_SECOND
const MILLISECONDS_PER_SECOND = 1000
const SETTLE_DISTANCE = 0.001
const FACE_HEIGHT = 0.3

export const useTracking = (props: UseTrackingProps) => {
  const viewport = useViewport(
    () => props.mode() === 'camera' && props.cameraSurface?.() === undefined,
    (cause) => props.onError(cause),
  )
  createEffect(() => {
    const mode = props.mode()
    const player = props.player()
    const canvas = props.canvas()
    const options = props.options?.()
    const reference = props.cameraSurface?.()
    const parameters = props.parameters()
    const bindings = props.bindings()
    const map = createTrackingParameters(parameters, bindings, options)
    if (player === null) {
      return
    }
    const centers = createTrackingCenters(parameters, bindings, options)
    const centerIds = Object.keys(centers)
    if (centerIds.length > 0) {
      player.patchParameterValues(centers)
    }
    if (mode === 'off' || canvas === null) {
      if (centerIds.length > 0) {
        onCleanup(() => player.clearParameterValues(centerIds))
      }
      return
    }
    const parameterIds = Object.keys(map({x: 0, y: 0}))
    if (parameterIds.length === 0) {
      return
    }
    let disposed = false
    let origin: TrackingPoint = {x: 0, y: 0}
    let target: TrackingPoint = {x: 0, y: 0}
    let current: TrackingPoint = {x: 0, y: 0}
    let frame = 0
    let previous: number | null = null
    let stop: (() => void) | null = null
    const step = (timestamp: number) => {
      frame = 0
      if (disposed) {
        return
      }
      const seconds =
        previous === null ? FRAME_SECONDS : (timestamp - previous) / MILLISECONDS_PER_SECOND
      previous = timestamp
      current = smoothTrackingPoint(current, target, seconds)
      player.patchParameterValues(map(current, origin))
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > SETTLE_DISTANCE) {
        frame = requestAnimationFrame(step)
      } else {
        previous = null
      }
    }
    const follow = (point: TrackingPoint) => {
      if (disposed) {
        return
      }
      const next = {x: bounded(point.x), y: bounded(point.y)}
      if (next.x === target.x && next.y === target.y) {
        return
      }
      target = next
      if (frame === 0) {
        frame = requestAnimationFrame(step)
      }
    }
    const cursor = (position: CursorPosition) => {
      const bounds = canvas.getBoundingClientRect()
      follow({
        x:
          (position.x - bounds.left - bounds.width / 2) /
          Math.max(bounds.width, position.width / 2, 1),
        y:
          -(position.y - bounds.top - bounds.height * FACE_HEIGHT) /
          Math.max(bounds.height, position.height / 2, 1),
      })
    }
    const camera = (point: FacePosition) => {
      const surface =
        reference ??
        canvasCameraSurface({bounds: canvas.getBoundingClientRect(), viewport: viewport()})
      if (surface === null) {
        origin = {x: 0, y: 0}
        follow(point)
        return
      }
      const {origin: cameraOrigin, target: cameraTarget} = cameraTrackingPoints({
        options,
        point,
        surface,
      })
      origin = cameraOrigin
      follow(cameraTarget)
    }

    const subscription = crypto.randomUUID()
    const connect = async () => {
      if (!isTauri()) {
        const move = (event: PointerEvent) =>
          cursor({height: innerHeight, width: innerWidth, x: event.clientX, y: event.clientY})
        if (mode === 'cursor') {
          globalThis.addEventListener('pointermove', move)
          stop = () => globalThis.removeEventListener('pointermove', move)
        }
        return
      }
      const unlisten =
        mode === 'cursor'
          ? await getCurrentWebview().listen<CursorPosition>('poffo-cursor', ({payload}) =>
              cursor(payload),
            )
          : await getCurrentWebview().listen<FacePosition>('poffo-face', ({payload}) =>
              camera(payload),
            )
      if (disposed) {
        unlisten()
        return
      }
      stop = unlisten
      if (mode === 'cursor') {
        await invoke('subscribe_poffo_cursor', {enabled: true, subscription})
        if (disposed) {
          await invoke('subscribe_poffo_cursor', {enabled: false, subscription})
        }
      }
    }
    connect().catch((cause: unknown) => {
      if (!disposed) {
        props.onError(cause)
      }
    })
    onCleanup(() => {
      disposed = true
      stop?.()
      cancelAnimationFrame(frame)
      player.clearParameterValues(parameterIds)
      if (isTauri() && mode === 'cursor') {
        invoke('subscribe_poffo_cursor', {enabled: false, subscription}).catch(props.onError)
      }
    })
  })
}
