import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  type PSceneMotionInput,
  PSceneRenderer,
  type PSceneState,
} from '../features/focus-room-animation/scene-renderer'
import {getPSceneLayer} from '../features/focus-room-animation/scene-layer-catalog'
import type {PSceneId} from '../features/focus-room-animation/scene-catalog'

export interface PSceneCanvasProps extends Omit<PSceneState, 'layerScene'> {
  readonly onLoadingChange?: (isLoading: boolean) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
  readonly sceneId: PSceneId
}

export default function PSceneCanvas(props: PSceneCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: PSceneRenderer | null = null

  const getSceneState = (): PSceneState => ({
    activity: props.activity,
    depthSource: props.depthSource,
    gaze: props.gaze,
    layerScene: getPSceneLayer(props.sceneId),
    motionInput: props.motionInput,
    motionMode: props.motionMode,
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
      globalThis.reportError(error)
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
          props.motionInput,
          props.motionMode,
          props.source,
          props.time,
          props.viseme,
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
