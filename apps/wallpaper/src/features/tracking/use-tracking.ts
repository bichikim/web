import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebview} from '@tauri-apps/api/webview'
import type {Player} from '@winter-love/puppet/player'
import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {
  createTrackingCenters,
  createTrackingParameters,
  resolveTrackingParameter,
} from './parameters'
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
import {createTrackingBlends} from './blends'
import {createCursorTarget} from './cursor-target'
import {createTrackingFollower} from './create-tracking-follower'

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
    const source = mode === 'off' ? 'camera' : mode
    const map = createTrackingParameters(parameters, bindings, options, source)
    if (player === null) {
      return
    }
    const blend = createTrackingBlends(parameters, bindings)
    const apply = (values: Readonly<Record<string, number>>) =>
      player.patchParameterBlends(blend(values))
    const release = (ids: readonly string[]) =>
      player.patchParameterBlends(Object.fromEntries(ids.map((id) => [id, undefined])))
    const centers = createTrackingCenters(parameters, bindings, options)
    const centerIds = Object.keys(centers)
    if (centerIds.length > 0) {
      apply(centers)
    }
    if (mode === 'off' || canvas === null) {
      if (centerIds.length > 0) {
        onCleanup(() => release(centerIds))
      }
      return
    }
    const parameterIds = Object.keys(map({x: 0, y: 0}))
    if (parameterIds.length === 0) {
      return
    }
    let disposed = false
    let origin: TrackingPoint = {x: 0, y: 0}
    let stop: (() => void) | null = null
    const follower = createTrackingFollower({
      body:
        resolveTrackingParameter(parameters, 'bodyX', bindings?.bodyX?.parameterId) !== undefined,
      bodySpeed: options?.bodyFollowSpeed ?? DEFAULT_TRACKING_OPTIONS.bodyFollowSpeed,
      eyeSpeed: options?.eyeFollowSpeed ?? DEFAULT_TRACKING_OPTIONS.eyeFollowSpeed,
      headSpeed: options?.headFollowSpeed ?? DEFAULT_TRACKING_OPTIONS.headFollowSpeed,
      onChange: (head, body, eyes) => apply(map(head, origin, body, eyes)),
    })
    const cursor = (position: CursorPosition) => {
      const surface = {
        bounds: canvas.getBoundingClientRect(),
        options,
        point: position,
        viewport: {height: innerHeight, width: innerWidth},
      }
      follower.follow(
        createCursorTarget(surface),
        createCursorTarget({
          ...surface,
          reach: options?.eyeCursorReach ?? DEFAULT_TRACKING_OPTIONS.eyeCursorReach,
        }),
      )
    }
    const camera = (point: FacePosition) => {
      if (mode === 'camera-pose') {
        const pose = point.detected === false ? null : point.pose
        origin = {x: 0, y: 0}
        follower.follow(
          pose?.head ?? {x: 0, y: 0, z: 0},
          pose?.eyes ?? {x: 0, y: 0},
          point.body ?? {x: 0, y: 0},
        )
        return
      }
      const surface =
        reference ??
        canvasCameraSurface({bounds: canvas.getBoundingClientRect(), viewport: viewport()})
      if (surface === null) {
        origin = {x: 0, y: 0}
        follower.follow(point)
        return
      }
      const {origin: cameraOrigin, target: cameraTarget} = cameraTrackingPoints({
        options,
        point,
        surface,
      })
      origin = cameraOrigin
      follower.follow(cameraTarget)
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
      follower.dispose()
      release(parameterIds)
      if (isTauri() && mode === 'cursor') {
        invoke('subscribe_poffo_cursor', {enabled: false, subscription}).catch(props.onError)
      }
    })
  })
}
