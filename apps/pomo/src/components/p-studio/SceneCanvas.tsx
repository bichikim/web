import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  type PSceneMotionInput,
  PSceneRenderer,
  type PSceneState,
} from '../../features/focus-room-animation/scene-renderer'
import {getPSceneLayer} from '../../features/focus-room-animation/scene-layer-catalog'
import type {PSceneId} from '../../features/focus-room-animation/scene-catalog'
import type {PSceneStyle} from '../../features/focus-room-animation/scene-style'
import {reportClientError} from '../../features/client-error-reporter'
import {applyWeatherSceneLayer, type WeatherSceneCondition} from '../../features/weather'

export interface PSceneCanvasProps extends Omit<PSceneState, 'layerScene'> {
  readonly onLoadingChange?: (isLoading: boolean) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly sceneId: PSceneId
  readonly sceneStyle?: PSceneStyle
  readonly weatherCondition?: WeatherSceneCondition
}

export default function PSceneCanvas(props: PSceneCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: PSceneRenderer | null = null

  const getSceneState = (): PSceneState => ({
    activity: props.activity,
    depthSource: props.depthSource,
    gaze: props.gaze,
    layerScene: applyWeatherSceneLayer({
      activity: props.activity,
      condition: props.weatherCondition ?? 'clear',
      scene: getPSceneLayer(props.sceneId, props.sceneStyle),
      sceneStyle: props.sceneStyle ?? 'original',
      time: props.time,
    }),
    motionInput: props.motionInput,
    motionMode: props.motionMode,
    sceneStyle: props.sceneStyle,
    source: props.source,
    time: props.time,
    viseme: props.viseme,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    const onLoadingChange = untrack(() => props.onLoadingChange)
    const onMotionInputChange = untrack(() => props.onMotionInputChange)
    renderer = new PSceneRenderer(host, {onLoadingChange, onMotionInputChange})
    renderer.initialize(untrack(getSceneState)).catch((error: unknown) => {
      onLoadingChange?.(false)
      reportClientError(error, {feature: 'focus-room-scene', source: 'direct'})
    })

    onCleanup(() => {
      renderer?.destroy()
      renderer = null
    })
  })

  createEffect(
    on(
      () =>
        [
          props.activity,
          props.depthSource,
          props.gaze,
          props.sceneId,
          props.sceneStyle,
          props.motionInput,
          props.motionMode,
          props.source,
          props.time,
          props.viseme,
          props.weatherCondition,
        ] as const,
      () => {
        renderer?.update(getSceneState())
      },
      {defer: true},
    ),
  )

  return (
    <div
      class="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      ref={setCanvasHost}
    />
  )
}
